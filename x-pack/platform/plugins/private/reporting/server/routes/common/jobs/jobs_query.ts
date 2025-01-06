/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransportResult, errors, estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { JOB_STATUS } from '@kbn/reporting-common';
import type { ReportApiJSON, ReportSource } from '@kbn/reporting-common/types';
import { REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY } from '@kbn/reporting-server';
import type { ReportingCore } from '../../..';
import { Report } from '../../../lib/store';
import { runtimeFieldKeys, runtimeFields } from '../../../lib/store/runtime_fields';
import type { ReportingUser } from '../../../types';
import type { Payload } from './get_document_payload';
import { getDocumentPayloadFactory } from './get_document_payload';

const defaultSize = 10;
const getUsername = (user: ReportingUser) => (user ? user.username : false);

function getSearchBody(body: estypes.SearchRequest): estypes.SearchRequest {
  return {
    _source: {
      excludes: ['output.content', 'payload.headers'],
    },
    sort: [{ created_at: { order: 'desc' } }],
    size: defaultSize,
    fields: runtimeFieldKeys,
    runtime_mappings: runtimeFields,
    ...body,
  };
}

export type ReportContent = Pick<ReportSource, 'status' | 'jobtype' | 'output'> & {
  payload?: Pick<ReportSource['payload'], 'title'>;
};

export interface JobsQueryFactory {
  list(
    user: ReportingUser,
    page: number,
    size: number,
    jobIds: string[] | null
  ): Promise<ReportApiJSON[]>;
  count(user: ReportingUser): Promise<number>;
  get(user: ReportingUser, id: string): Promise<ReportApiJSON | void>;
  getError(id: string): Promise<string>;
  getDocumentPayload(doc: ReportApiJSON): Promise<Payload>;
  delete(deleteIndex: string, id: string): Promise<TransportResult<estypes.DeleteResponse>>;
}

export function jobsQueryFactory(
  reportingCore: ReportingCore,
  { isInternal }: { isInternal: boolean }
): JobsQueryFactory {
  async function execQuery<
    T extends (client: ElasticsearchClient) => Promise<Awaited<ReturnType<T>> | undefined>
  >(callback: T): Promise<Awaited<ReturnType<T>> | undefined> {
    try {
      const { asInternalUser: client } = await reportingCore.getEsClient();

      return await callback(client);
    } catch (error) {
      if (error instanceof errors.ResponseError && [401, 403, 404].includes(error.statusCode!)) {
        return;
      }

      throw error;
    }
  }

  return {
    async list(user, page = 0, size = defaultSize, jobIds) {
      const username = getUsername(user);
      const body = getSearchBody({
        size,
        from: size * page,
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [
                  { term: { created_by: username } },
                  ...(jobIds ? [{ ids: { values: jobIds } }] : []),
                ],
              },
            },
          },
        },
      });

      const response = (await execQuery((elasticsearchClient) =>
        elasticsearchClient.search({ body, index: REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY })
      )) as estypes.SearchResponse<ReportSource>;

      return (
        response?.hits?.hits.map((report: estypes.SearchHit<ReportSource>) => {
          const { _source: reportSource, ...reportHead } = report;
          if (!reportSource) {
            throw new Error(`Search hit did not include _source!`);
          }

          const reportInstance = new Report({ ...reportSource, ...reportHead });
          return reportInstance.toApiJSON();
        }) ?? []
      );
    },

    async count(user) {
      const username = getUsername(user);
      const body = {
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [{ term: { created_by: username } }],
              },
            },
          },
        },
      };

      const response = await execQuery((elasticsearchClient) =>
        elasticsearchClient.count({ body, index: REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY })
      );

      return response?.count ?? 0;
    },

    async get(user, id) {
      const { logger } = reportingCore.getPluginSetupDeps();
      if (!id) {
        logger.warn(`No ID provided for GET`);
        return;
      }

      const username = getUsername(user);

      const body = getSearchBody({
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [{ term: { _id: id } }, { term: { created_by: username } }],
              },
            },
          },
        },
        size: 1,
      });

      const response = await execQuery((elasticsearchClient) =>
        elasticsearchClient.search<ReportSource>({
          body,
          index: REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY,
        })
      );

      const result = response?.hits?.hits?.[0];
      if (!result?._source) {
        logger.warn(`No hits resulted in search`);
        return;
      }

      const report = new Report({ ...result, ...result._source }, result.fields);
      return report.toApiJSON();
    },

    async getError(id) {
      const body: estypes.SearchRequest = {
        _source: {
          includes: ['output.content', 'status'],
        },
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [{ term: { _id: id } }],
              },
            },
          },
        },
        size: 1,
      };

      const response = await execQuery((elasticsearchClient) =>
        elasticsearchClient.search<ReportSource>({
          body,
          index: REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY,
        })
      );
      const hits = response?.hits?.hits?.[0];
      const status = hits?._source?.status;

      if (status !== JOB_STATUS.FAILED) {
        throw new Error(`Can not get error for ${id}`);
      }

      return hits?._source?.output?.content!;
    },

    async getDocumentPayload(doc: ReportApiJSON) {
      const getDocumentPayload = getDocumentPayloadFactory(reportingCore, { isInternal });
      return await getDocumentPayload(doc);
    },

    async delete(deleteIndex, id) {
      try {
        const { asInternalUser: elasticsearchClient } = await reportingCore.getEsClient();
        const query = { id, index: deleteIndex };
        return await elasticsearchClient.delete(query, { meta: true });
      } catch (error) {
        throw new Error(
          i18n.translate('xpack.reporting.jobsQuery.deleteError', {
            defaultMessage: 'Could not delete the report: {error}',
            values: { error: error.message },
          })
        );
      }
    },
  };
}
