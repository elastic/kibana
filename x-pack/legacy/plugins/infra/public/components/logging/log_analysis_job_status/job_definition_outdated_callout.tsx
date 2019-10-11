/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

export const JobDefinitionOutdatedCallout: React.FC<{
  onRecreateMlJob: () => void;
}> = ({ onRecreateMlJob }) => (
  <EuiCallOut color="warning" iconType="alert" title={jobDefinitionOutdatedTitle}>
    <FormattedMessage
      id="xpack.infra.logs.analysis.jobDefinitionOutdatedCalloutMessage"
      defaultMessage="A newer version of the ML job is available. Recreate the job to deploy the newest version. This removes previously detected anomalies."
      tagName="p"
    />
    <EuiButton color="warning" onClick={onRecreateMlJob}>
      <FormattedMessage
        id="xpack.infra.logs.analysis.recreateJobButtonLabel"
        defaultMessage="Recreate ML job"
      />
    </EuiButton>
  </EuiCallOut>
);

const jobDefinitionOutdatedTitle = i18n.translate(
  'xpack.infra.logs.analysis.jobDefinitionOutdatedCalloutTitle',
  {
    defaultMessage: 'ML job definition outdated',
  }
);
