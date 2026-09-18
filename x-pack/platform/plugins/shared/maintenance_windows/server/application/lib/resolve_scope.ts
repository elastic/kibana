/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { DataViewBase, EsQueryConfig, Filter } from '@kbn/es-query';
import { buildEsQuery, fromKueryExpression } from '@kbn/es-query';
import { getScopedQueryErrorMessage } from '../../../common';
import type { AlertsFilterQueryAttributes, AlertingV2ScopeAttributes } from '../../data/types';

export interface ScopeInput {
  alerting?: {
    enabled: boolean;
    kql?: string;
    filters?: AlertsFilterQueryAttributes['filters'];
    dsl?: string;
  };
  alertingV2?: { enabled: boolean; kql?: string };
}

export interface ResolvedScope {
  alerting?: AlertsFilterQueryAttributes;
  alertingV2?: AlertingV2ScopeAttributes;
}

/**
 * Resolves a requested scope into storage-ready attributes. For alerting v1, compiles the KQL
 * filter into an ES DSL string via buildEsQuery. For alerting v2, performs syntax-only validation
 * (fromKueryExpression) — never compiled to DSL.
 */
export const resolveScope = ({
  scope,
  esQueryConfig,
  indexPattern,
  errorPrefix,
}: {
  scope: ScopeInput;
  esQueryConfig: EsQueryConfig;
  indexPattern: DataViewBase;
  errorPrefix: string;
}): ResolvedScope => {
  const resolved: ResolvedScope = {};

  // alerting v1: enabled=false → not selected; enabled=true without kql or filters → no filter;
  // enabled=true with kql or filters → compile DSL.
  if (scope.alerting !== undefined) {
    if (!scope.alerting.enabled) {
      // Not selected — omit from resolved.
    } else if (!scope.alerting.kql && !scope.alerting.filters?.length) {
      resolved.alerting = { enabled: true };
    } else {
      try {
        const dsl = JSON.stringify(
          buildEsQuery(
            indexPattern,
            scope.alerting.kql ? [{ query: scope.alerting.kql, language: 'kuery' }] : [],
            (scope.alerting.filters ?? []) as Filter[],
            esQueryConfig
          )
        );
        resolved.alerting = {
          enabled: true,
          ...(scope.alerting.kql ? { kql: scope.alerting.kql } : {}),
          ...(scope.alerting.filters?.length ? { filters: scope.alerting.filters } : {}),
          dsl,
        };
      } catch (error) {
        throw Boom.badRequest(`${errorPrefix} - ${getScopedQueryErrorMessage(error.message)}`);
      }
    }
  }

  // alerting v2: syntax check only. NEVER buildEsQuery, NEVER getAlertsDataViewBase, NEVER dsl.
  if (scope.alertingV2 !== undefined) {
    if (!scope.alertingV2.enabled) {
      // Not selected — omit from resolved.
    } else if (!scope.alertingV2.kql || scope.alertingV2.kql.trim() === '') {
      resolved.alertingV2 = { enabled: true };
    } else {
      try {
        fromKueryExpression(scope.alertingV2.kql);
      } catch (error) {
        throw Boom.badRequest(`${errorPrefix} - ${getScopedQueryErrorMessage(error.message)}`);
      }
      resolved.alertingV2 = { enabled: true, kql: scope.alertingV2.kql };
    }
  }

  return resolved;
};
