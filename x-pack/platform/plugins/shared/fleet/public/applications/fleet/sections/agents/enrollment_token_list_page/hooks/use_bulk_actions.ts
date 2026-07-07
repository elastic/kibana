/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { i18n } from '@kbn/i18n';

import { useStartServices, sendBulkDeleteEnrollmentAPIKeys } from '../../../../hooks';
import type { EnrollmentAPIKey } from '../../../../types';

import type { BulkAction } from '../components/token_actions';

type SelectionMode = 'manual' | 'query';

export const useBulkActions = ({
  kuery,
  selectedTokens,
  selectionMode,
  refresh,
}: {
  kuery: string;
  selectedTokens: EnrollmentAPIKey[];
  selectionMode: SelectionMode;
  refresh: () => void;
}) => {
  const { notifications } = useStartServices();
  const [bulkActionPending, setBulkActionPending] = useState<BulkAction | null>(null);
  const [isBulkActionInProgress, setIsBulkActionInProgress] = useState(false);

  const onBulkActionConfirm = async () => {
    const action = bulkActionPending!;
    setBulkActionPending(null);
    setIsBulkActionInProgress(true);

    const body =
      selectionMode === 'query'
        ? { kuery, forceDelete: action === 'delete' }
        : { tokenIds: selectedTokens.map((t) => t.id), forceDelete: action === 'delete' };

    try {
      const res = await sendBulkDeleteEnrollmentAPIKeys(body);
      if (res.error) throw res.error;

      const count = res.data?.count ?? 0;
      const successCount = res.data?.successCount ?? 0;
      const errorCount = res.data?.errorCount ?? 0;
      const actionLabel = action === 'delete' ? 'deleted' : 'revoked';

      if (count === successCount) {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.fleet.enrollmentTokensList.bulkActionSuccess', {
            defaultMessage:
              '{successCount, plural, one {# enrollment token} other {# enrollment tokens}} {actionLabel}',
            values: { successCount, actionLabel },
          })
        );
      } else if (count === errorCount) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.fleet.enrollmentTokensList.bulkActionAllErrors', {
            defaultMessage:
              'Failed to {actionLabel} {errorCount, plural, one {# enrollment token} other {# enrollment tokens}}',
            values: { errorCount, actionLabel },
          })
        );
      } else {
        notifications.toasts.addWarning(
          i18n.translate('xpack.fleet.enrollmentTokensList.bulkActionPartialErrors', {
            defaultMessage:
              '{successCount, plural, one {# enrollment token} other {# enrollment tokens}} {actionLabel}, {errorCount, plural, one {# token} other {# tokens}} failed',
            values: { successCount, errorCount, actionLabel },
          })
        );
      }
    } catch (err) {
      notifications.toasts.addError(err as Error, { title: 'Error' });
    }

    setIsBulkActionInProgress(false);
    refresh();
  };

  return {
    bulkActionPending,
    setBulkActionPending,
    isBulkActionInProgress,
    onBulkActionConfirm,
  };
};
