/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiToolTip } from '@elastic/eui';

import { splitSizeAndUnits, DataStream } from '../../../common';
import { timeUnits, extraTimeUnits } from '../constants/time_units';

export const isManaged = (dataStream: DataStream): boolean => {
  return Boolean(dataStream._meta?.managed);
};

export const filterDataStreams = (
  dataStreams: DataStream[],
  visibleTypes: string[]
): DataStream[] => {
  return dataStreams.filter((dataStream: DataStream) => {
    // include all data streams that are neither hidden nor managed
    if (!dataStream.hidden && !isManaged(dataStream)) {
      return true;
    }
    if (dataStream.hidden && visibleTypes.includes('hidden')) {
      return true;
    }
    return isManaged(dataStream) && visibleTypes.includes('managed');
  });
};

export const isSelectedDataStreamHidden = (
  dataStreams: DataStream[],
  selectedDataStreamName?: string
): boolean => {
  return (
    !!selectedDataStreamName &&
    !!dataStreams.find((dataStream: DataStream) => dataStream.name === selectedDataStreamName)
      ?.hidden
  );
};

export const getLifecycleValue = (
  lifecycle?: DataStream['lifecycle'],
  inifniteAsIcon?: boolean
) => {
  if (!lifecycle?.enabled) {
    return i18n.translate('xpack.idxMgmt.dataStreamList.dataRetentionDisabled', {
      defaultMessage: 'Disabled',
    });
  } else if (!lifecycle?.data_retention) {
    const infiniteDataRetention = i18n.translate(
      'xpack.idxMgmt.dataStreamList.dataRetentionInfinite',
      {
        defaultMessage: 'Keep data indefinitely',
      }
    );

    if (inifniteAsIcon) {
      return (
        <EuiToolTip
          data-test-subj="infiniteRetention"
          position="top"
          content={infiniteDataRetention}
        >
          <EuiIcon type="infinity" />
        </EuiToolTip>
      );
    }

    return infiniteDataRetention;
  }

  // Extract size and unit, in order to correctly map the unit to the correct text
  const { size, unit } = splitSizeAndUnits(lifecycle?.data_retention as string);
  const availableTimeUnits = [...timeUnits, ...extraTimeUnits];
  const match = availableTimeUnits.find((timeUnit) => timeUnit.value === unit);

  return `${size} ${match?.text ?? unit}`;
};

export const isDataStreamFullyManagedByILM = (dataStream?: DataStream | null) => {
  return (
    dataStream?.nextGenerationManagedBy?.toLowerCase() === 'index lifecycle management' &&
    dataStream?.indices?.every(
      (index) => index.managedBy.toLowerCase() === 'index lifecycle management'
    )
  );
};

export const isDataStreamFullyManagedByDSL = (dataStream?: DataStream | null) => {
  return (
    dataStream?.nextGenerationManagedBy?.toLowerCase() === 'data stream lifecycle' &&
    dataStream?.indices?.every((index) => index.managedBy.toLowerCase() === 'data stream lifecycle')
  );
};

export const isDSLWithILMIndices = (dataStream?: DataStream | null) => {
  if (dataStream?.nextGenerationManagedBy?.toLowerCase() === 'data stream lifecycle') {
    const ilmIndices = dataStream?.indices?.filter(
      (index) => index.managedBy.toLowerCase() === 'index lifecycle management'
    );
    const dslIndices = dataStream?.indices?.filter(
      (index) => index.managedBy.toLowerCase() === 'data stream lifecycle'
    );

    // When there arent any ILM indices, there's no need to show anything.
    if (!ilmIndices?.length) {
      return;
    }

    return {
      ilmIndices,
      dslIndices,
    };
  }

  return;
};
