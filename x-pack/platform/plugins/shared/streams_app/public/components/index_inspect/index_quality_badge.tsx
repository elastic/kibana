/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import { useDataSetQuality } from '../../hooks/use_data_set_quality';

/**
 * Data quality indicator for a data stream. Mount only once the failure store state is known:
 * the underlying doc counts are fetched once per mount.
 */
export function IndexQualityBadge({
  indexName,
  canReadFailureStore,
  failureStoreEnabled,
}: {
  indexName: string;
  canReadFailureStore: boolean;
  failureStoreEnabled: boolean;
}) {
  const { quality, isQualityLoading, isFailedDocCountKnown } = useDataSetQuality(
    indexName,
    undefined,
    canReadFailureStore && failureStoreEnabled
  );

  if (failureStoreEnabled && !isFailedDocCountKnown && !isQualityLoading) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.streams.indexInspect.qualityBadge.unavailableTooltip', {
          defaultMessage:
            "Data quality is unavailable because the failure store couldn't be read for this data stream.",
        })}
      >
        <EuiBadge color="hollow" tabIndex={0} data-test-subj="streamsIndexQualityUnavailable">
          {i18n.translate('xpack.streams.indexInspect.qualityBadge.unavailableLabel', {
            defaultMessage: 'Quality unavailable',
          })}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  return (
    <DatasetQualityIndicator
      quality={quality}
      isLoading={isQualityLoading}
      verbose={true}
      showTooltip={true}
    />
  );
}
