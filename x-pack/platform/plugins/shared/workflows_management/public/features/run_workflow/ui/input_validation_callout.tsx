/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export interface InputValidationCalloutProps {
  errors?: string | null;
  warnings?: string | null;
}

const TITLE = i18n.translate('workflows.inputValidationCallout.title', {
  defaultMessage: 'Input data is not valid',
});
const WARNINGS_TITLE = i18n.translate('workflows.inputValidationCallout.warningsTitle', {
  defaultMessage: 'Input data does not match the expected shape',
});

export const InputValidationCallout: React.FC<InputValidationCalloutProps> = React.memo(
  ({ errors, warnings }) => (
    <>
      {errors && (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="question"
          size="s"
          title={TITLE}
          data-test-subj="workflow-input-validation-callout"
        >
          <p>{errors}</p>
        </EuiCallOut>
      )}
      {warnings && (
        <EuiCallOut
          announceOnMount
          color="warning"
          iconType="warning"
          size="s"
          title={WARNINGS_TITLE}
          data-test-subj="workflow-input-warnings-callout"
        >
          <p>{warnings}</p>
        </EuiCallOut>
      )}
    </>
  )
);
InputValidationCallout.displayName = 'InputValidationCallout';
