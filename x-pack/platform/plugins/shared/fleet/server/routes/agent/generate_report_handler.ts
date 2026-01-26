/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import {
  DataView,
  SortDirection,
  type EsQuerySortValue,
  type SearchSourceFields,
} from '@kbn/data-plugin/common';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { ReportingStart } from '@kbn/reporting-plugin/server';

import { AGENT_API_ROUTES, getSortConfig, removeSOAttributes } from '../../../common';
import type { FleetRequestHandler, PostGenerateAgentsReportRequestSchema } from '../../types';
import { appContextService } from '../../services/app_context';
import { buildAgentStatusRuntimeField } from '../../services/agents/build_status_runtime_field';
import { FleetError } from '../../errors';

type HandleResponseFunc = Parameters<ReportingStart['handleGenerateSystemReportRequest']>[2];

export const generateReportHandler: FleetRequestHandler<
  Record<string, string>,
  null,
  TypeOf<typeof PostGenerateAgentsReportRequestSchema.body>
> = async (context, request, response) => {
  const { agents, fields, timezone, sort } = request.body;
  const logger = appContextService.getLogger();
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request);

  if (!user) {
    throw new FleetError('User not authenticated');
  }

  const runtimeFieldsResult = await buildAgentStatusRuntimeField();
  const runtimeFields = runtimeFieldsResult.status.script?.source ?? 'emit("")';

  const reporting = appContextService.getReportingStart();
  if (!reporting) {
    throw new FleetError('Report generation is not ready');
  }

  const jobConfig = {
    jobParams: getJobParams(agents, fields, runtimeFields, timezone, sort),
    exportTypeId: 'csv_searchsource',
  };

  const handleResponse: HandleResponseFunc = async (result, err?) => {
    if (err) {
      throw err;
    }

    if (!result) {
      throw new FleetError('Report generation encountered an unknown error');
    }

    return response.ok({
      body: {
        url: result.downloadUrl,
      },
    });
  };

  try {
    return await reporting.handleGenerateSystemReportRequest(
      AGENT_API_ROUTES.GENERATE_REPORT_PATTERN,
      {
        request,
        response,
        context,
        jobConfig,
      },
      handleResponse
    );
  } catch (error) {
    logger.error(`Failed to generate report: ${error.message}`);
    throw new FleetError(`Failed to generate report: ${error.message}`);
  }
};

const VERSION_FIELD = 'local_metadata.elastic.agent.version';
const HOSTNAME_FIELD = 'local_metadata.host.hostname';

export const getSortFieldForAPI = (field: string): string => {
  if ([VERSION_FIELD, HOSTNAME_FIELD].includes(field)) {
    return `${field}.keyword`;
  }
  return field;
};

const getJobParams = (
  agents: string[] | string,
  fields: string[],
  runtimeFields: string,
  timezone: string,
  sortOptions?: { field?: string; direction?: string }
) => {
  const index = new DataView({
    spec: {
      title: '.fleet-agents',
      allowHidden: true,
      runtimeFieldMap: {
        status: {
          type: 'keyword',
          script: {
            source: runtimeFields,
          },
        },
      },
    },
    fieldFormats: {} as FieldFormatsStartCommon,
  });

  const query = Array.isArray(agents) ? `agent.id:(${agents.join(' OR ')})` : agents;

  const sortField = getSortFieldForAPI(sortOptions?.field ?? 'enrolled_at');
  const sortOrder = (sortOptions?.direction as SortDirection) ?? SortDirection.desc;

  const sort = getSortConfig(sortField, sortOrder) as EsQuerySortValue[];

  const searchSource: SearchSourceFields = {
    query: {
      query: '',
      language: 'kuery',
    },
    filter: {
      meta: {
        index: 'fleet-agents',
        params: {},
      },
      query: toElasticsearchQuery(fromKueryExpression(removeSOAttributes(query))),
    },
    fields,
    index,
    sort,
  };

  return {
    title: 'Agent List',
    objectType: 'search',
    columns: fields,
    searchSource,
    version: appContextService.getKibanaVersion(),
    browserTimezone: timezone,
  };
};
