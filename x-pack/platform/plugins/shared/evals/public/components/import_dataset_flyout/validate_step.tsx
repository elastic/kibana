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
}

export const ValidateStep = ({ validCount, errors }: ValidateStepProps) => {
  const hasValidRows = validCount > 0;
  const hasErrors = errors.length > 0;
  const color = hasValidRows ? (hasErrors ? 'warning' : 'success') : 'danger';
  const title = hasValidRows
    ? hasErrors
      ? translations.VALIDATION_WARNING_TITLE
      : translations.VALIDATION_SUCCESS_TITLE
    : translations.NO_VALID_ROWS_TITLE;

  return (
    <>
      <EuiCallOut color={color} title={title}>
        <p>{translations.getValidationDescription(validCount, errors.length)}</p>
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
