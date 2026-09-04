/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef } from 'react';
import type { ClientConfigType, ReportingAPIClient } from '@kbn/reporting-public';
import { useKibana } from '@kbn/reporting-public';

import { ReportDiagnostic } from './report_diagnostic';
import type { ReportDiagnosticHandle } from './report_diagnostic';
import { MigrateIlmPolicyCallOut } from './migrate_ilm_policy_callout';

export interface ReportingTabsProps {
  config: ClientConfigType;
  apiClient: ReportingAPIClient;
}

export const IlmPolicyWrapper = forwardRef<ReportDiagnosticHandle, ReportingTabsProps>(
  ({ config, apiClient }, ref) => {
    const {
      services: { notifications },
    } = useKibana();

    return (
      <>
        <MigrateIlmPolicyCallOut toasts={notifications.toasts} />
        <ReportDiagnostic ref={ref} hideTrigger clientConfig={config} apiClient={apiClient} />
      </>
    );
  }
);

IlmPolicyWrapper.displayName = 'IlmPolicyWrapper';

// eslint-disable-next-line import/no-default-export
export { IlmPolicyWrapper as default };
