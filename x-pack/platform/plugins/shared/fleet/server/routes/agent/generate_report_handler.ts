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

import { getSortConfig, removeSOAttributes } from '../../../common';
import type { FleetRequestHandler, PostGenerateAgentsReportRequestSchema } from '../../types';
import { appContextService } from '../../services/app_context';
import { buildAgentStatusRuntimeField } from '../../services/agents/build_status_runtime_field';
import { FleetError } from '../../errors';

export const generateReportHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostGenerateAgentsReportRequestSchema.body>
> = async (context, request, response) => {
  const { agentIds, fields, sort } = request.body;
  const runtimeFieldsResult = await buildAgentStatusRuntimeField();
  const runtimeFields = runtimeFieldsResult.status.script?.source ?? 'emit("")';
  // const coreContext = await context.core;
  // const esClient = coreContext.elasticsearch.client.asInternalUser;
  const reporting = appContextService.getReportingStart();
  if (!reporting) {
    throw new FleetError('Report generation is not ready');
  }

  // TODO add browserTimezone as API param for use in here
  // Get kibana version for version field
  // As happens in src/platform/packages/private/kbn-reporting/public/reporting_api_client.ts
  const jobParams = getJobParams(agentIds, fields, runtimeFields, sort);

  return response.ok({ body: { url: 'https://elastic.co' } });
};

// TODO move this helper to a common location
const VERSION_FIELD = 'local_metadata.elastic.agent.version';
const HOSTNAME_FIELD = 'local_metadata.host.hostname';

export const getSortFieldForAPI = (field: string): string => {
  if ([VERSION_FIELD, HOSTNAME_FIELD].includes(field)) {
    return `${field}.keyword`;
  }
  return field;
};

const getJobParams = (
  agentIds: string[],
  fields: string[],
  runtimeFields: string,
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

  const query = `agent.id:(${agentIds.join(' OR ')})`;

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
  };
};
