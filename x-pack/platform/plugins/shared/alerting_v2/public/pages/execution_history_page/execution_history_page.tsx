/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';

export const ExecutionHistoryPage = () => {
  useBreadcrumbs('execution_history_list');

  return (
    <>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.alertingV2.executionHistory.pageTitle"
            defaultMessage="Execution history"
          />
        }
      />
      <EuiSpacer size="l" />
    </>
  );
};
