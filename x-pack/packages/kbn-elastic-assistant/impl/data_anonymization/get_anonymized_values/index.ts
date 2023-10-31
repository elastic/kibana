/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowed, isAnonymized } from '../../data_anonymization_editor/helpers';
import { AnonymizedValues, GetAnonymizedValues } from '../types';

export const getAnonymizedValues: GetAnonymizedValues = ({
  allowSet,
  allowReplacementSet,
  currentReplacements,
  field,
  getAnonymizedValue,
  rawData,
}): AnonymizedValues => {
  const rawValues = rawData[field] ?? [];

  return rawValues.reduce<AnonymizedValues>(
    (acc, rawValue) => {
      if (isAllowed({ allowSet, field }) && isAnonymized({ allowReplacementSet, field })) {
        const anonymizedValue = getAnonymizedValue({ currentReplacements, rawValue });

        return {
          anonymizedValues: [...acc.anonymizedValues, anonymizedValue],
          replacements: {
            ...acc.replacements,
            [anonymizedValue]: rawValue,
          },
        };
      } else if (isAllowed({ allowSet, field })) {
        return {
          anonymizedValues: [...acc.anonymizedValues, rawValue], // no anonymization for this value
          replacements: {
            ...acc.replacements, // no additional replacements
          },
        };
      } else {
        return acc;
      }
    },
    {
      anonymizedValues: [],
      replacements: {},
    }
  );
};
