/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import { BaseMetricCard } from '../../common/base_metric_card';
import { getTimeSizeAndUnitLabel } from '../../helpers/format_size_units';
import type { useFailureStoreConfig } from '../../hooks/use_failure_store_config';

export const RetentionCard = ({
  openModal,
  canManageFailureStore,
  streamName,
  failureStoreConfig,
}: {
  openModal: (show: boolean) => void;
  canManageFailureStore: boolean;
  streamName: string;
  failureStoreConfig: ReturnType<typeof useFailureStoreConfig>;
}) => {
  const {
    failureStoreEnabled,
    customRetentionPeriod,
    defaultRetentionPeriod,
    inheritOptions,
    retentionDisabled,
  } = failureStoreConfig;

  if (!failureStoreEnabled) {
    return null;
  }

  const {
    isWired: isWiredStream,
    isCurrentlyInherited: isInheritingFailureStore,
    canShowInherit,
  } = inheritOptions;
  const title = i18n.translate(
    'xpack.streams.streamDetailView.failureStoreEnabled.failureRetentionCard.title',
    {
      defaultMessage: 'Retention',
    }
  );

  const getRetentionOrigin = () => {
    if (isWiredStream) {
      if (isInheritingFailureStore) {
        return i18n.translate('xpack.streams.streamDetailFailureStore.inheritingFromParent', {
          defaultMessage: 'Inherit from parent',
        });
      } else if (canShowInherit) {
        return i18n.translate('xpack.streams.streamDetailFailureStore.overrideParent', {
          defaultMessage: 'Override parent',
        });
      }
      return null;
    }

    if (!isWiredStream) {
      return isInheritingFailureStore
        ? i18n.translate('xpack.streams.streamDetailFailureStore.inheritingFromIndexTemplate', {
            defaultMessage: 'Inherit from index template',
          })
        : i18n.translate('xpack.streams.streamDetailFailureStore.overrideIndexTemplate', {
            defaultMessage: 'Override index template',
          });
    }

    return null;
  };

  const retentionOrigin = getRetentionOrigin();

  const retentionTypeApplied = retentionDisabled
    ? i18n.translate(
        'xpack.streams.streamDetailView.failureStoreEnabled.failureRetentionCard.indefinite',
        {
          defaultMessage: 'Indefinite retention',
        }
      )
    : customRetentionPeriod
    ? i18n.translate(
        'xpack.streams.streamDetailView.failureStoreEnabled.failureRetentionCard.custom',
        {
          defaultMessage: 'Custom retention period',
        }
      )
    : i18n.translate(
        'xpack.streams.streamDetailView.failureStoreEnabled.failureRetentionCard.default',
        {
          defaultMessage: 'Default retention period',
        }
      );

  const failureRetentionPeriod = retentionDisabled
    ? '∞'
    : customRetentionPeriod
    ? getTimeSizeAndUnitLabel(customRetentionPeriod)
    : getTimeSizeAndUnitLabel(defaultRetentionPeriod);

  const subtitles = retentionOrigin
    ? [retentionTypeApplied, retentionOrigin]
    : [retentionTypeApplied];

  const metric = [
    {
      data: failureRetentionPeriod,
      subtitle: subtitles,
      'data-test-subj': 'failureStoreRetention',
    },
  ];

  return (
    <BaseMetricCard
      title={title}
      actions={
        canManageFailureStore ? (
          <EuiButton
            data-test-subj="streamFailureStoreEditRetention"
            size="s"
            color="text"
            onClick={() => openModal(true)}
            aria-label={i18n.translate(
              'xpack.streams.streamDetailView.failureStoreEnabled.failureRetentionCard.editFailureStoreRetentionMethodAriaLabel',
              {
                defaultMessage: 'Edit failure store retention method',
              }
            )}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.failureStoreEnabled.failureRetentionCard.editRetentionMethodButton',
              {
                defaultMessage: 'Edit retention method',
              }
            )}
          </EuiButton>
        ) : undefined
      }
      metrics={metric}
      data-test-subj="failureStoreRetentionCard"
    />
  );
};
