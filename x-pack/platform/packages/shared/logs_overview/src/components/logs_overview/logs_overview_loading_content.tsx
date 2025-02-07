/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const LogsOverviewLoadingContent: React.FC = ({}) => {
  return (
    <EuiEmptyPrompt
      icon={<EuiLoadingSpinner size="xl" />}
      title={<h2>{logsOverviewLoadingTitle}</h2>}
    />
  );
};

const logsOverviewLoadingTitle = i18n.translate('xpack.observabilityLogsOverview.loadingTitle', {
  defaultMessage: 'Loading',
});
