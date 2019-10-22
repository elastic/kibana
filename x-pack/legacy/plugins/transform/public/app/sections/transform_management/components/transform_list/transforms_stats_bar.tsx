/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { StatsBar, TransformStatsBarStats } from '../stats_bar';
import { TRANSFORM_STATE, TRANSFORM_MODE, TransformListRow } from '../../../../common';

function createTranformStats(transformsList: TransformListRow[]) {
  const transformStats = {
    total: {
      label: i18n.translate('xpack.transform.statsBar.totalTransformsLabel', {
        defaultMessage: 'Total transforms',
      }),
      value: 0,
      show: true,
    },
    batch: {
      label: i18n.translate('xpack.transform.statsBar.batchTransformsLabel', {
        defaultMessage: 'Batch',
      }),
      value: 0,
      show: true,
    },
    continuous: {
      label: i18n.translate('xpack.transform.statsBar.continuousTransformsLabel', {
        defaultMessage: 'Continuous',
      }),
      value: 0,
      show: true,
    },
    failed: {
      label: i18n.translate('xpack.transform.statsBar.failedTransformsLabel', {
        defaultMessage: 'Failed',
      }),
      value: 0,
      show: false,
    },
    started: {
      label: i18n.translate('xpack.transform.statsBar.startedTransformsLabel', {
        defaultMessage: 'Started',
      }),
      value: 0,
      show: true,
    },
  };

  if (transformsList === undefined) {
    return transformStats;
  }

  let failedTransforms = 0;
  let startedTransforms = 0;

  transformsList.forEach(transform => {
    if (transform.mode === TRANSFORM_MODE.CONTINUOUS) {
      transformStats.continuous.value++;
    } else if (transform.mode === TRANSFORM_MODE.BATCH) {
      transformStats.batch.value++;
    }

    if (transform.stats.state === TRANSFORM_STATE.FAILED) {
      failedTransforms++;
    } else if (transform.stats.state === TRANSFORM_STATE.STARTED) {
      startedTransforms++;
    }
  });

  transformStats.total.value = transformsList.length;
  transformStats.started.value = startedTransforms;

  if (failedTransforms !== 0) {
    transformStats.failed.value = failedTransforms;
    transformStats.failed.show = true;
  } else {
    transformStats.failed.show = false;
  }

  return transformStats;
}

interface Props {
  transformsList: TransformListRow[];
}

export const TransformStatsBar: FC<Props> = ({ transformsList }) => {
  const transformStats: TransformStatsBarStats = createTranformStats(transformsList);

  return <StatsBar stats={transformStats} dataTestSub={'transformStatsBar'} />;
};
