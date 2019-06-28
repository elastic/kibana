/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  InvalidEsIntervalFormatError,
  InvalidEsCalendarIntervalError,
  parseEsInterval,
} from 'ui/utils/parse_es_interval';

export function validateRollupDelay(rollupDelay) {
  // This field is optional, so if nothing has been provided we can skip validation.
  if (!rollupDelay || !rollupDelay.trim()) {
    return undefined;
  }

  try {
    parseEsInterval(rollupDelay);
  } catch(error) {
    if (error instanceof InvalidEsIntervalFormatError) {
      return [(
        <FormattedMessage
          id="xpack.rollupJobs.create.errors.rollupDelayInvalidFormat"
          defaultMessage="Invalid delay format."
        />
      )];
    }

    if (error instanceof InvalidEsCalendarIntervalError) {
      const { unit } = error;
      return [(
        <FormattedMessage
          id="xpack.rollupJobs.create.errors.rollupDelayInvalidCalendarInterval"
          defaultMessage="The '{unit}' unit only allows values of 1. Try {suggestion}."
          values={{
            unit,
            suggestion: (
              <strong>
                <FormattedMessage
                  id="xpack.rollupJobs.create.errors.rollupDelayInvalidCalendarIntervalSuggestion"
                  defaultMessage="1{unit}"
                  values={{ unit }}
                />
              </strong>
            )
          }}
        />
      )];
    }

    throw(error);
  }

  return undefined;
}
