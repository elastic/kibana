/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useFailureStoreRedirectLink } from '../../hooks/use_failure_store_redirect_link';
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
  const { href } = useFailureStoreRedirectLink({ streamName });
  const {
    failureStoreEnabled,
    customRetentionPeriod,
    defaultRetentionPeriod,
    inheritOptions,
    isDisabledLifecycle,
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
      defaultMessage: 'Failure retention',
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

  const retentionTypeApplied = isDisabledLifecycle
    ? i18n.translate(
        'xpack.streams.streamDetailView.failureStoreEnabled.failureRetentionCard.infinite',
        {
          defaultMessage: 'Infinite retention',
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

  const failureRetentionPeriod = isDisabledLifecycle
    ? '∞'
    : customRetentionPeriod
    ? getTimeSizeAndUnitLabel(customRetentionPeriod)
    : getTimeSizeAndUnitLabel(defaultRetentionPeriod);

  const viewInDiscover = i18n.translate(
    'xpack.streams.streamDetailView.failureStoreEnabled.failureRetentionCard.discoverButton',
    {
      defaultMessage: 'View in discover',
    }
  );
  const editFailureStore = i18n.translate(
    'xpack.streams.streamDetailView.failureStoreEnabled.failureRetentionCard.editButton',
    {
      defaultMessage: 'Edit failure store',
    }
  );

  const getActions = () => {
    const actions = [];
    if (canManageFailureStore) {
      actions.push({
        iconType: 'pencil',
        ariaLabel: editFailureStore,
        tooltip: editFailureStore,
        onClick: () => openModal(true),
        'data-test-subj': 'streamFailureStoreEditRetention',
      });
    }
    actions.push({
      iconType: 'discoverApp',
      ariaLabel: viewInDiscover,
      tooltip: viewInDiscover,
      href,
      'data-test-subj': 'streamFailureStoreViewInDiscover',
    });
    return actions;
  };

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

  return <BaseMetricCard title={title} actions={getActions()} metrics={metric} />;
};
