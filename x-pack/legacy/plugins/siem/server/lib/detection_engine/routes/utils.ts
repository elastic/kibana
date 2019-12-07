/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pickBy } from 'lodash/fp';
import { APP_ID, SIGNALS_INDEX_KEY } from '../../../../common/constants';
import { RuleAlertType, isAlertType, OutputRuleAlertRest, isAlertTypes } from '../alerts/types';
import { ServerFacade, RequestFacade } from '../../../types';

export const getIdError = ({
  id,
  ruleId,
}: {
  id: string | undefined | null;
  ruleId: string | undefined | null;
}) => {
  if (id != null) {
    return new Boom(`id of ${id} not found`, { statusCode: 404 });
  } else if (ruleId != null) {
    return new Boom(`rule_id of ${ruleId} not found`, { statusCode: 404 });
  } else {
    return new Boom(`id or rule_id should have been defined`, { statusCode: 404 });
  }
};

// Transforms the data but will remove any null or undefined it encounters and not include
// those on the export
export const transformAlertToRule = (alert: RuleAlertType): Partial<OutputRuleAlertRest> => {
  return pickBy<OutputRuleAlertRest>((value: unknown) => value != null, {
    created_by: alert.createdBy,
    description: alert.params.description,
    enabled: alert.enabled,
    false_positives: alert.params.falsePositives,
    filters: alert.params.filters,
    from: alert.params.from,
    id: alert.id,
    immutable: alert.params.immutable,
    index: alert.params.index,
    interval: alert.interval,
    rule_id: alert.params.ruleId,
    language: alert.params.language,
    output_index: alert.params.outputIndex,
    max_signals: alert.params.maxSignals,
    risk_score: alert.params.riskScore,
    name: alert.name,
    query: alert.params.query,
    references: alert.params.references,
    saved_id: alert.params.savedId,
    meta: alert.params.meta,
    severity: alert.params.severity,
    updated_by: alert.updatedBy,
    tags: alert.params.tags,
    to: alert.params.to,
    type: alert.params.type,
    threats: alert.params.threats,
  });
};

export const transformFindAlertsOrError = (findResults: { data: unknown[] }): unknown | Boom => {
  if (isAlertTypes(findResults.data)) {
    findResults.data = findResults.data.map(alert => transformAlertToRule(alert));
    return findResults;
  } else {
    return new Boom('Internal error transforming', { statusCode: 500 });
  }
};

export const transformOrError = (alert: unknown): Partial<OutputRuleAlertRest> | Boom => {
  if (isAlertType(alert)) {
    return transformAlertToRule(alert);
  } else {
    return new Boom('Internal error transforming', { statusCode: 500 });
  }
};

export const transformError = (err: Error & { statusCode?: number }) => {
  if (Boom.isBoom(err)) {
    return err;
  } else {
    if (err.statusCode != null) {
      return new Boom(err.message, { statusCode: err.statusCode });
    } else {
      // natively return the err and allow the regular framework
      // to deal with the error when it is a non Boom
      return err;
    }
  }
};

export const getIndex = (request: RequestFacade, server: ServerFacade): string => {
  const spaceId = server.plugins.spaces.getSpaceId(request);
  const signalsIndex = server.config().get(`xpack.${APP_ID}.${SIGNALS_INDEX_KEY}`);
  return `${signalsIndex}-${spaceId}`;
};

export const callWithRequestFactory = (request: RequestFacade) => {
  const { callWithRequest } = request.server.plugins.elasticsearch.getCluster('data');
  return <T, U>(endpoint: string, params: T, options?: U) => {
    return callWithRequest(request, endpoint, params, options);
  };
};
