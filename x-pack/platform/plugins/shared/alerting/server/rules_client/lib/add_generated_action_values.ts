/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import Boom from '@hapi/boom';
import { normalizePersistedFilterMeta, type AlertsFilter } from '@kbn/alerting-types';
import type {
  NormalizedAlertAction,
  NormalizedAlertDefaultActionWithGeneratedValues,
  NormalizedAlertSystemActionWithGeneratedValues,
  NormalizedSystemAction,
  RulesClientContext,
} from '..';
import { getEsQueryConfig } from '../../lib/get_es_query_config';
import type { RawRuleAlertsFilter } from '../../types';

type RawRuleAlertsFilterQuery = NonNullable<RawRuleAlertsFilter['query']>;

const normalizeGeneratedAlertsFilterQuery = (
  query: AlertsFilter['query'],
  generateDSL: (kql: string, filters: Filter[]) => string
): RawRuleAlertsFilter['query'] | undefined => {
  if (!query) {
    return undefined;
  }

  const { kql, filters = [] } = query;

  return {
    kql,
    filters: filters.map((filter) => ({
      ...filter,
      meta: normalizePersistedFilterMeta(filter.meta),
    })) as RawRuleAlertsFilterQuery['filters'],
    dsl: generateDSL(kql, filters),
  };
};

export async function addGeneratedActionValues(
  actions: NormalizedAlertAction[] = [],
  systemActions: NormalizedSystemAction[] = [],
  context: RulesClientContext
): Promise<{
  actions: NormalizedAlertDefaultActionWithGeneratedValues[];
  systemActions: NormalizedAlertSystemActionWithGeneratedValues[];
}> {
  const uiSettingClient = context.uiSettings.asScopedToClient(context.unsecuredSavedObjectsClient);
  const esQueryConfig = await getEsQueryConfig(uiSettingClient);

  const generateDSL = (kql: string, filters: Filter[]): string => {
    try {
      return JSON.stringify(
        buildEsQuery(undefined, [{ query: kql, language: 'kuery' }], filters, esQueryConfig)
      );
    } catch (e) {
      throw Boom.badRequest(`Invalid KQL: ${e.message}`);
    }
  };

  return {
    actions: actions.map((action) => {
      const { alertsFilter, uuid, ...restAction } = action;
      return {
        ...restAction,
        uuid: uuid || v4(),
        ...(alertsFilter
          ? {
              alertsFilter: {
                ...alertsFilter,
                query: normalizeGeneratedAlertsFilterQuery(alertsFilter.query, generateDSL),
              } as RawRuleAlertsFilter,
            }
          : {}),
      };
    }),
    systemActions: systemActions.map((systemAction) => ({
      ...systemAction,
      uuid: systemAction.uuid || v4(),
    })),
  };
}
