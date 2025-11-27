/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { FailureStoreModal } from '@kbn/failure-store-modal';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useDatasetQualityTable } from '../../../hooks';
import type { DataStreamStat } from '../../../../common/data_streams_stats';

export const FailureStoreHoverLink: React.FC<{
  dataStreamStat: DataStreamStat;
}> = ({ dataStreamStat }) => {
  const [hovered, setHovered] = React.useState(false);
  const [isFailureStoreModalOpen, setIsFailureStoreModalOpen] = useState(false);
  const { updateFailureStore } = useDatasetQualityTable();

  const closeModal = () => {
    setIsFailureStoreModalOpen(false);
  };
  const handleSaveModal = async (data: {
    failureStoreEnabled: boolean;
    customRetentionPeriod?: string;
  }) => {
    updateFailureStore({
      dataStreamName: dataStreamStat.rawName,
      failureStoreEnabled: data.failureStoreEnabled,
      customRetentionPeriod: data.customRetentionPeriod,
    });
    closeModal();
  };

  const onClick = () => {
    setIsFailureStoreModalOpen(true);
  };

  return (
    <>
      <EuiToolTip
        content={i18n.translate('xpack.datasetQuality.failureStore.notEnabled', {
          defaultMessage:
            'Failure store is not enabled for this data stream. Enable failure store.',
        })}
        data-test-subj="failureStoreNotEnabledTooltip"
      >
        <EuiButtonEmpty
          data-test-subj={`datasetQualitySetFailureStoreLink-${dataStreamStat.rawName}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          css={{ fontWeight: 'normal' }}
          aria-label={i18n.translate('xpack.datasetQuality.failureStore.setAriaLabel', {
            defaultMessage: 'Set failure store for data stream {dataStreamName}',
            values: { dataStreamName: dataStreamStat.rawName },
          })}
          onClick={onClick}
        >
          {hovered
            ? i18n.translate('xpack.datasetQuality.failureStore.enable', {
                defaultMessage: 'Set failure store',
              })
            : i18n.translate('xpack.datasetQuality.failureStore.notAvailable', {
                defaultMessage: 'N/A',
              })}
        </EuiButtonEmpty>
      </EuiToolTip>
      {isFailureStoreModalOpen && (
        <FailureStoreModal
          onCloseModal={closeModal}
          onSaveModal={handleSaveModal}
          failureStoreProps={{
            failureStoreEnabled: dataStreamStat.hasFailureStore ?? false,
            defaultRetentionPeriod: dataStreamStat.defaultRetentionPeriod,
            customRetentionPeriod: dataStreamStat.customRetentionPeriod,
          }}
        />
      )}
    </>
  );
};
