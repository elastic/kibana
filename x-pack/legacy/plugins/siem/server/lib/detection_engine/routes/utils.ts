/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pickBy, identity } from 'lodash/fp';
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
  return pickBy<OutputSignalAlertRest>(identity, {
    created_by: signal.createdBy,
    description: signal.alertTypeParams.description,
    enabled: signal.enabled,
    false_positives: signal.alertTypeParams.falsePositives,
    filter: signal.alertTypeParams.filter,
    filters: signal.alertTypeParams.filters,
    from: signal.alertTypeParams.from,
    id: signal.id,
    immutable: signal.alertTypeParams.immutable,
    index: signal.alertTypeParams.index,
    interval: signal.interval,
    rule_id: signal.alertTypeParams.ruleId,
    language: signal.alertTypeParams.language,
    max_signals: signal.alertTypeParams.maxSignals,
    name: signal.name,
    query: signal.alertTypeParams.query,
    references: signal.alertTypeParams.references,
    saved_id: signal.alertTypeParams.savedId,
    severity: signal.alertTypeParams.severity,
    size: signal.alertTypeParams.size,
    updated_by: signal.updatedBy,
    tags: signal.alertTypeParams.tags,
    to: signal.alertTypeParams.to,
    type: signal.alertTypeParams.type,
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
