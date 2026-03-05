/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { i18n } from '@kbn/i18n';

import type { Installation } from '../../common/types';

import { useStartServices } from '../applications/fleet/hooks';

import { useReviewUpgradeMutation } from './use_request/epm';

export interface UpgradeReviewProps {
  pkgName: string;
  pkgTitle: string;
  pendingUpgradeReview: NonNullable<Installation['pending_upgrade_review']>;
}

export const useUpgradeReviewActions = ({
  pkgName,
  pkgTitle,
  targetVersion,
}: {
  pkgName: string;
  pkgTitle: string;
  targetVersion: string;
}) => {
  const reviewUpgradeMutation = useReviewUpgradeMutation();
  const { notifications } = useStartServices();

  const handleAccept = useCallback(
    (onSuccess?: () => void) => {
      reviewUpgradeMutation.mutate(
        { pkgName, action: 'accept', targetVersion },
        {
          onSuccess: () => {
            notifications.toasts.addSuccess({
              title: i18n.translate('xpack.fleet.upgradeReviewActions.upgradeReviewAcceptedTitle', {
                defaultMessage: 'Auto-upgrade accepted for {title} {version}',
                values: { title: pkgTitle, version: targetVersion },
              }),
            });
            onSuccess?.();
          },
        }
      );
    },
    [reviewUpgradeMutation, pkgName, pkgTitle, targetVersion, notifications.toasts]
  );

  const handleDismiss = useCallback(
    (onSuccess?: () => void) => {
      reviewUpgradeMutation.mutate(
        { pkgName, action: 'decline', targetVersion },
        {
          onSuccess: () => {
            notifications.toasts.addInfo({
              title: i18n.translate(
                'xpack.fleet.upgradeReviewActions.upgradeReviewDismissedTitle',
                {
                  defaultMessage: 'Auto-upgrade paused for {title} {version}',
                  values: { title: pkgTitle, version: targetVersion },
                }
              ),
            });
            onSuccess?.();
          },
        }
      );
    },
    [reviewUpgradeMutation, pkgName, pkgTitle, targetVersion, notifications.toasts]
  );

  const handleReEnable = useCallback(
    (onSuccess?: () => void) => {
      reviewUpgradeMutation.mutate(
        { pkgName, action: 'pending', targetVersion },
        {
          onSuccess: () => {
            notifications.toasts.addSuccess({
              title: i18n.translate(
                'xpack.fleet.upgradeReviewActions.upgradeReviewReEnabledTitle',
                {
                  defaultMessage: 'Upgrade review resumed for {title} {version}',
                  values: { title: pkgTitle, version: targetVersion },
                }
              ),
            });
            onSuccess?.();
          },
        }
      );
    },
    [reviewUpgradeMutation, pkgName, pkgTitle, targetVersion, notifications.toasts]
  );

  return {
    handleAccept,
    handleDismiss,
    handleReEnable,
    isLoading: reviewUpgradeMutation.isLoading,
  };
};
