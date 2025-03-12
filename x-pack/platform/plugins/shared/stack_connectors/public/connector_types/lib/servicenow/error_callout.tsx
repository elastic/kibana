/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const ERROR_MESSAGE = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.errorCallout.errorTitle',
  {
    defaultMessage: 'Error',
  }
);

interface Props {
  message: string | null;
}

const ErrorCalloutComponent: React.FC<Props> = ({ message }) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="m"
        iconType="warning"
        data-test-subj="errorCallout"
        color="danger"
        title={ERROR_MESSAGE}
      >
        <p>{message}</p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

export const ErrorCallout = memo(ErrorCalloutComponent);
