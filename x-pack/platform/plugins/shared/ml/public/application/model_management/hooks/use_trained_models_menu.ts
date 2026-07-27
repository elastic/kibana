/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderMenu } from '@kbn/app-header';
import { usePermissionCheck } from '../../capabilities/check_capabilities';

interface UseTrainedModelsMenuArgs {
  onOpenSyncFlyout: () => void;
  onOpenAddModelFlyout: () => void;
}

export const useTrainedModelsMenu = ({
  onOpenSyncFlyout,
  onOpenAddModelFlyout,
}: UseTrainedModelsMenuArgs): AppHeaderMenu => {
  const [canCreateJob, canCreateDataFrameAnalytics, canCreateTrainedModels] = usePermissionCheck([
    'canCreateJob',
    'canCreateDataFrameAnalytics',
    'canCreateTrainedModels',
  ]);

  const canSync = canCreateJob || canCreateDataFrameAnalytics || canCreateTrainedModels;

  return useMemo<AppHeaderMenu>(
    () => ({
      primaryActionItem: {
        id: 'addTrainedModel',
        label: i18n.translate('xpack.ml.trainedModels.modelsList.addModelButtonLabel', {
          defaultMessage: 'Add trained model',
        }),
        iconType: 'plusInCircle' as const,
        run: onOpenAddModelFlyout,
        testId: 'mlModelsAddTrainedModelButton',
      },
      items: [
        {
          id: 'syncSavedObjects',
          order: 100,
          label: i18n.translate('xpack.ml.management.jobsList.syncFlyoutButton', {
            defaultMessage: 'Synchronize saved objects',
          }),
          iconType: 'inputOutput' as const,
          run: onOpenSyncFlyout,
          testId: 'mlStackMgmtSyncButton',
          disableButton: !canSync,
        },
      ],
    }),
    [canSync, onOpenAddModelFlyout, onOpenSyncFlyout]
  );
};
