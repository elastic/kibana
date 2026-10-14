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

      if (count === successCount) {
        notifications.toasts.addSuccess(
          action === 'delete'
            ? i18n.translate('xpack.fleet.enrollmentTokensList.bulkDeleteSuccess', {
                defaultMessage:
                  '{successCount, plural, one {# enrollment token} other {# enrollment tokens}} deleted',
                values: { successCount },
              })
            : i18n.translate('xpack.fleet.enrollmentTokensList.bulkRevokeSuccess', {
                defaultMessage:
                  '{successCount, plural, one {# enrollment token} other {# enrollment tokens}} revoked',
                values: { successCount },
              })
        );
      } else if (count === errorCount) {
        notifications.toasts.addDanger(
          action === 'delete'
            ? i18n.translate('xpack.fleet.enrollmentTokensList.bulkDeleteAllErrors', {
                defaultMessage:
                  'Failed to delete {errorCount, plural, one {# enrollment token} other {# enrollment tokens}}',
                values: { errorCount },
              })
            : i18n.translate('xpack.fleet.enrollmentTokensList.bulkRevokeAllErrors', {
                defaultMessage:
                  'Failed to revoke {errorCount, plural, one {# enrollment token} other {# enrollment tokens}}',
                values: { errorCount },
              })
        );
      } else {
        notifications.toasts.addWarning(
          action === 'delete'
            ? i18n.translate('xpack.fleet.enrollmentTokensList.bulkDeletePartialErrors', {
                defaultMessage:
                  '{successCount, plural, one {# enrollment token} other {# enrollment tokens}} deleted, {errorCount, plural, one {# token} other {# tokens}} failed',
                values: { successCount, errorCount },
              })
            : i18n.translate('xpack.fleet.enrollmentTokensList.bulkRevokePartialErrors', {
                defaultMessage:
                  '{successCount, plural, one {# enrollment token} other {# enrollment tokens}} revoked, {errorCount, plural, one {# token} other {# tokens}} failed',
                values: { successCount, errorCount },
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
