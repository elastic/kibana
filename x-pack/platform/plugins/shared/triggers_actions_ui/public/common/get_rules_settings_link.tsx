/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { AlertDeleteCategoryIds } from '@kbn/alerting-plugin/common/constants/alert_delete';

const queryClient = new QueryClient();

const RulesSettingsLinkLazy: React.FC<{ alertDeleteCategoryIds?: AlertDeleteCategoryIds[] }> = lazy(
  () => import('../application/components/rules_setting/rules_settings_link')
);

export const getRulesSettingsLinkLazy = ({
  alertDeleteCategoryIds,
}: {
  alertDeleteCategoryIds?: AlertDeleteCategoryIds[];
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <RulesSettingsLinkLazy alertDeleteCategoryIds={alertDeleteCategoryIds} />
      </Suspense>
    </QueryClientProvider>
  );
};
