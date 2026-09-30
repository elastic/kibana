/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import type { ImportRowError } from './lib';
import * as translations from './translations';

interface ValidateStepProps {
  validCount: number;
  errors: ImportRowError[];
  blockingErrors: string[];
}

export const ValidateStep = ({ validCount, errors, blockingErrors }: ValidateStepProps) => {
  const hasValidRows = validCount > 0;
  const hasErrors = errors.length > 0;
  const isBlocked = blockingErrors.length > 0;
  const color = isBlocked || !hasValidRows ? 'danger' : hasErrors ? 'warning' : 'success';
  const title = isBlocked
    ? translations.VALIDATION_BLOCKED_TITLE
    : hasValidRows
    ? hasErrors
      ? translations.VALIDATION_WARNING_TITLE
      : translations.VALIDATION_SUCCESS_TITLE
    : translations.NO_VALID_ROWS_TITLE;

  return (
    <>
      <EuiCallOut color={color} title={title}>
        <p>{translations.getValidationDescription(validCount, errors.length)}</p>
        {isBlocked ? (
          <ul>
            {blockingErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
      </EuiCallOut>
      {hasErrors ? (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id="evalsImportDatasetRowErrors"
            buttonContent={translations.ERROR_DETAILS_BUTTON_LABEL}
            paddingSize="m"
          >
            <EuiText size="s">
              <ul>
                {errors.map(({ rowNumber, message }, index) => (
                  <li key={`${rowNumber}-${index}`}>
                    {translations.getRowError(rowNumber, message)}
                  </li>
                ))}
              </ul>
            </EuiText>
          </EuiAccordion>
        </>
      ) : null}
    </>
  );
};
