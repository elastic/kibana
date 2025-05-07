/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import type { ReportingCore } from '../../..';
import type { ListScheduledReportApiJSON, ReportingUser, ScheduledReportType } from '../../../types';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY } from '@kbn/reporting-server';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { RRule } from '@kbn/rrule';

export const MAX_SCHEDULED_REPORT_LIST_SIZE = 100;
export const DEFAULT_SCHEDULED_REPORT_LIST_SIZE = 10;

// TODO - remove .keyword when mapping is fixed
const SCHEDULED_REPORT_ID_FIELD = 'scheduled_report_id.keyword';
const CREATED_AT_FIELD = 'created_at';
const getUsername = (user: ReportingUser) => (user ? user.username : false);

interface ApiResponse {
  page: number;
  per_page: number;
  total: number;
  data: ListScheduledReportApiJSON[];
}

const getEmptyApiResponse = (page: number, perPage: number) => ({
  page,
  per_page: perPage,
  total: 0,
  data: [],
});

export type CreatedAtSearchResponse = SearchResponse<{created_at: string}>;

export function transformResponse(result: SavedObjectsFindResponse<ScheduledReportType>, lastResponse: CreatedAtSearchResponse): ApiResponse {
  return {
    page: result.page,
    per_page: result.per_page,
    total: result.total,
    data: result.saved_objects.map((so) => {
      const id = so.id;
      const lastRunForId = lastResponse.hits.hits.find((hit) => hit.fields?.[SCHEDULED_REPORT_ID_FIELD]?.[0] === id);

      const schedule = so.attributes.schedule;
      const _rrule = new RRule({
        ...schedule.rrule,
        dtstart: new Date(),
      })

      return {
        id,
        created_at: so.attributes.createdAt,
        created_by: so.attributes.createdBy,
        enabled: so.attributes.enabled,
        jobtype: so.attributes.jobType,
        last_run: lastRunForId?._source?.[CREATED_AT_FIELD],
        next_run: _rrule.after(new Date())?.toISOString(),
        notification: so.attributes.notification,
        schedule: so.attributes.schedule,
        title: so.attributes.title,
      };
    }),
  };
}

export interface ScheduledQueryFactory {
  list(
    req: KibanaRequest,
    user: ReportingUser,
    page: number,
    size: number
  ): Promise<ApiResponse>;
}

export function scheduledQueryFactory(
  reportingCore: ReportingCore
): ScheduledQueryFactory {
  async function execQuery<
    T extends (client: SavedObjectsClientContract) => Promise<Awaited<ReturnType<T>> | undefined>
  >(req: KibanaRequest, callback: T): Promise<Awaited<ReturnType<T>> | undefined> {
    try {
      const client = await reportingCore.getSoClient(req);

      return await callback(client);
    } catch (error) {
      if (error instanceof errors.ResponseError && [401, 403, 404].includes(error.statusCode!)) {
        return;
      }

      throw error;
    }
  }

  async function execLastRunQuery<
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
    async list(req, user, page = 1, size = DEFAULT_SCHEDULED_REPORT_LIST_SIZE) {
      const username = getUsername(user);

      // if user has Manage Reporting privileges, we can list
      // scheduled reports for all users in this space, otherwise
      // we will filter only to the scheduled reports created by the user
      const canManageReporting = await reportingCore.canManageReportingForSpace(req);

      const response = await execQuery(req, (soClient) =>
        soClient.find<ScheduledReportType>({
          type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
          page,
          perPage: size,
          ...(!canManageReporting ? { filter: `createdBy: "${username}"` } : {}),
        })
      );

      if (!response) {
        return getEmptyApiResponse(page, size);
      }

      const scheduledReportSoIds = response?.saved_objects.map((so) => so.id);
      console.log(`scheduledReportSoIds ${JSON.stringify(scheduledReportSoIds)}`);

      if (!scheduledReportSoIds || scheduledReportSoIds.length === 0) {
        return getEmptyApiResponse(page, size);
      }

      const lastRunResponse = (await execLastRunQuery((esClient) =>
      esClient.search({
        index: REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY,
        size,
        _source: [CREATED_AT_FIELD],
        sort: [ { [CREATED_AT_FIELD]: { order: 'desc' } } ],
        query: {
          bool: {
            filter: [
              {
                terms: {
                  [SCHEDULED_REPORT_ID_FIELD]: scheduledReportSoIds,
                }
              },
            ]
          }
        },
        collapse: { field: SCHEDULED_REPORT_ID_FIELD }
      }))) as SearchResponse<{created_at: string}>;

      console.log(`lastRunResponse ${JSON.stringify(lastRunResponse)}`);

      return transformResponse(response, lastRunResponse);
    },
  };
}
