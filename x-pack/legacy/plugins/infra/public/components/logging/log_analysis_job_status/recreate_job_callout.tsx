/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const RecreateJobCallout: React.FC<{
  onRecreateMlJob: () => void;
  title?: React.ReactNode;
}> = ({ children, onRecreateMlJob, title }) => (
  <EuiCallOut color="warning" iconType="alert" title={title}>
    <p>{children}</p>
    <EuiButton color="warning" onClick={onRecreateMlJob}>
      <FormattedMessage
        id="xpack.infra.logs.analysis.recreateJobButtonLabel"
        defaultMessage="Recreate ML job"
      />
    </EuiButton>
  </EuiCallOut>
);
