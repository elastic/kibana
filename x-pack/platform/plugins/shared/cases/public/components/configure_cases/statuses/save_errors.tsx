/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import * as i18n from './translations';

/** The problems that stopped the statuses from saving. */
export const SaveErrors: React.FC<{ errors: string[] }> = ({ errors }) => {
  if (errors.length === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        announceOnMount
        title={i18n.SAVE_ERROR_TITLE}
        color="danger"
        iconType="error"
        size="s"
        data-test-subj="case-statuses-save-errors"
      >
        <ul>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

SaveErrors.displayName = 'SaveErrors';
