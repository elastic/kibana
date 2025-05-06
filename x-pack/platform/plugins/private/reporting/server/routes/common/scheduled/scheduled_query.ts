/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, estypes } from '@elastic/elasticsearch';
import type {
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import type { ReportSource } from '@kbn/reporting-common/types';
import { transformResponse } from '@kbn/alerting-plugin/server/routes/backfill/apis/schedule/transforms';
import { RawScheduledReport } from '../../../saved_objects/scheduled_report/schemas/latest';
import type { ReportingCore } from '../../..';
import { runtimeFieldKeys, runtimeFields } from '../../../lib/store/runtime_fields';
import type { ReportingUser } from '../../../types';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../../saved_objects';

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

export function transformResponse(result: SavedObjectsFindResponse<RawScheduledReport>) {
  return {
    page: result.page,
    per_page: result.per_page,
    total: result.total,
    data: result.saved_objects.map((so) => ({})
  };
}

export type ReportContent = Pick<ReportSource, 'status' | 'jobtype' | 'output'> & {
  payload?: Pick<ReportSource['payload'], 'title'>;
};

export interface ScheduledQueryFactory {
  list(
    req: KibanaRequest,
    user: ReportingUser,
    page: number,
    size: number
  ): Promise<SavedObjectsFindResponse<RawScheduledReport>>;
}

export function scheduledQueryFactory(
  reportingCore: ReportingCore,
  { isInternal }: { isInternal: boolean }
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

  return {
    async list(req, user, page = 1, size = defaultSize) {
      const username = getUsername(user);

      // if user has Manage Reporting privileges, we can list
      // scheduled reports for all users in this space, otherwise
      // we will filter only to the scheduled reports created by the user
      const canManageReporting = await reportingCore.canManageReportingForSpace(req);
      console.log(`canManageReporting: ${canManageReporting}`);

      const response = await execQuery(req, (soClient) =>
        soClient.find<RawScheduledReport>({
          type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
          page,
          perPage: size,
          ...(!canManageReporting ? { filter: `createdBy: "${username}` } : {}),
        })
      );

      console.log(`response ${JSON.stringify(response)}`);

      return transformResponse(response as SavedObjectsFindResponse<RawScheduledReport>);
    },
  };
}
