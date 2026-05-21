/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EditDeletePhaseFlyoutValue } from '../types';
import { formatDuration, parseIntervalWithDefaultUnit } from '../../shared';
import type { EditDeletePhaseFlyoutForm } from './types';

const FALLBACK_RETENTION_PERIOD = '30d';

export const mapDeletePhaseToFormValues = ({
  defaultRetentionPeriod,
  initialValue,
}: {
  defaultRetentionPeriod?: string;
  initialValue: EditDeletePhaseFlyoutValue;
}): EditDeletePhaseFlyoutForm => {
  const isUsingDefaultRetention = Boolean(
    initialValue.deletePhaseEnabled && initialValue.isDefaultRetention
  );
  const retentionPeriod = initialValue.deletePhaseEnabled
    ? isUsingDefaultRetention
      ? defaultRetentionPeriod ?? initialValue.dataRetention
      : initialValue.dataRetention
    : defaultRetentionPeriod ?? FALLBACK_RETENTION_PERIOD;
  const { value, unit } = parseIntervalWithDefaultUnit(retentionPeriod);

  return {
    minAgeValue: value,
    minAgeUnit: unit,
    isUsingDefaultRetention,
  };
};

export const mapFormValuesToDeletePhase = (
  data: EditDeletePhaseFlyoutForm
): EditDeletePhaseFlyoutValue => {
  const trimmedValue = data.minAgeValue.trim();
  if (trimmedValue === '') {
    return {
      deletePhaseEnabled: false,
    };
  }

  const dataRetention = formatDuration(trimmedValue, data.minAgeUnit, {
    integerOnly: true,
    minInclusive: 0,
  });
  if (!dataRetention) {
    return {
      deletePhaseEnabled: false,
    };
  }

  return {
    deletePhaseEnabled: true,
    dataRetention,
    isDefaultRetention: data.isUsingDefaultRetention,
  };
};

export const serializeFormValuesToDeletePhase = (
  data: EditDeletePhaseFlyoutForm
): EditDeletePhaseFlyoutValue => {
  const trimmedValue = data.minAgeValue.trim();
  const dataRetention = formatDuration(trimmedValue, data.minAgeUnit, {
    integerOnly: true,
    minInclusive: 0,
  });

  return {
    deletePhaseEnabled: true,
    // This should be guaranteed by the schema + handleSubmit, but we defensively avoid silently disabling
    // the delete phase on submit if something changes upstream.
    dataRetention: dataRetention ?? `${trimmedValue}${data.minAgeUnit}`,
    isDefaultRetention: data.isUsingDefaultRetention,
  };
};
