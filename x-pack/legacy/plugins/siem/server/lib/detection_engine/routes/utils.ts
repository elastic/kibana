/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pickBy } from 'lodash/fp';
import { SignalAlertType, isAlertType, OutputSignalAlertRest, isAlertTypes } from '../alerts/types';

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
export const transformAlertToSignal = (signal: SignalAlertType): Partial<OutputSignalAlertRest> => {
  return pickBy<OutputSignalAlertRest>((value: unknown) => value != null, {
    created_by: signal.createdBy,
    description: signal.params.description,
    enabled: signal.enabled,
    false_positives: signal.params.falsePositives,
    filter: signal.params.filter,
    filters: signal.params.filters,
    from: signal.params.from,
    id: signal.id,
    immutable: signal.params.immutable,
    index: signal.params.index,
    interval: signal.interval,
    rule_id: signal.params.ruleId,
    language: signal.params.language,
    output_index: signal.params.outputIndex,
    max_signals: signal.params.maxSignals,
    risk_score: signal.params.riskScore,
    name: signal.name,
    query: signal.params.query,
    references: signal.params.references,
    saved_id: signal.params.savedId,
    meta: signal.params.meta,
    severity: signal.params.severity,
    size: signal.params.size,
    updated_by: signal.updatedBy,
    tags: signal.params.tags,
    to: signal.params.to,
    type: signal.params.type,
  });
};

export const transformFindAlertsOrError = (findResults: { data: unknown[] }): unknown | Boom => {
  if (isAlertTypes(findResults.data)) {
    findResults.data = findResults.data.map(signal => transformAlertToSignal(signal));
    return findResults;
  } else {
    return new Boom('Internal error transforming', { statusCode: 500 });
  }
};

export const transformOrError = (signal: unknown): Partial<OutputSignalAlertRest> | Boom => {
  if (isAlertType(signal)) {
    return transformAlertToSignal(signal);
  } else {
    return new Boom('Internal error transforming', { statusCode: 500 });
  }
};
