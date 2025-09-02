/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { useFailureStoreRedirectLink } from '../../hooks/use_failure_store_redirect_link';
import { BaseMetricCard } from '../../common/base_metric_card';
import { getTimeSizeAndUnitLabel } from '../../helpers/format_size_units';

export const RetentionCard = ({
  openModal,
  definition,
}: {
  openModal: (show: boolean) => void;
  definition: Streams.ingest.all.GetResponse;
}) => {
  const { href } = useFailureStoreRedirectLink({ definition });

  const { failure_store: failureStore } = definition;
  if (!failureStore || !failureStore.retentionPeriod) {
    return null;
  }
  const { retentionPeriod } = failureStore;

  const title = i18n.translate(
    'xpack.streams.streamDetailView.failureStoreEnabled.failureRetentionCard.title',
    {
      defaultMessage: 'Failure retention',
    }
  );

  const retentionTypeApplied = retentionPeriod.custom
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

  const failureRetentionPeriod = retentionPeriod.custom
    ? getTimeSizeAndUnitLabel(retentionPeriod.custom)
    : getTimeSizeAndUnitLabel(retentionPeriod.default);

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

  const actions = [
    {
      iconType: 'pencil',
      ariaLabel: editFailureStore,
      tooltip: editFailureStore,
      onClick: () => openModal(true),
      'data-test-subj': 'streamFailureStoreEditRetention',
    },
    {
      iconType: 'discoverApp',
      ariaLabel: viewInDiscover,
      tooltip: viewInDiscover,
      href,
      'data-test-subj': 'streamFailureStoreViewInDiscover',
    },
  ];

  const metric = [
    {
      data: failureRetentionPeriod,
      subtitle: retentionTypeApplied,
      'data-test-subj': 'failureStoreRetention',
    },
  ];

  return <BaseMetricCard title={title} actions={actions} metrics={metric} />;
};
