/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export const JobConfigurationOutdatedCallout: React.FC<{
  onRecreateMlJob: () => void;
}> = ({ onRecreateMlJob }) => (
  <EuiCallOut color="warning" iconType="alert" title={jobConfigurationOutdatedTitle}>
    <FormattedMessage
      id="xpack.infra.logs.analysis.jobConfigurationOutdatedCalloutMessage"
      defaultMessage="The job was created based on a different source configuration. Recreate the job to apply the current configuration. This removes previously detected anomalies."
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

const jobConfigurationOutdatedTitle = i18n.translate(
  'xpack.infra.logs.analysis.jobConfigurationOutdatedCalloutTitle',
  {
    defaultMessage: 'ML job configuration outdated',
  }
);
