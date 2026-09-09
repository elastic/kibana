/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import type { ImportResult } from './reducer';
import * as translations from './translations';

export const ResultStep = ({ result }: { result: ImportResult }) => {
  const isPartial = result.failed > 0;

  return (
    <EuiCallOut
      color={isPartial ? 'warning' : 'success'}
      title={isPartial ? translations.RESULT_PARTIAL_TITLE : translations.RESULT_SUCCESS_TITLE}
    >
      <p>{translations.getResultDescription(result.added, result.skippedDuplicates)}</p>
      {isPartial ? (
        <>
          <p>{translations.getFailedDescription(result.failed)}</p>
          {result.errors.length > 0 ? (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s">
                <ul>
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </EuiText>
            </>
          ) : null}
        </>
      ) : null}
    </EuiCallOut>
  );
};
