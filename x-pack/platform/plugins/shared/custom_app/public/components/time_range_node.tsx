/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSuperDatePicker, type OnTimeChangeProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import { useDataLayer } from '../data/data_layer_context';
import { useTimeRangeControl } from '../runtime/time_range_context';
import { useSubjectValue } from '../utils/use_subject_value';

/** Shown until the first fetch tells what the period is. */
const FALLBACK = { from: 'now-24h', to: 'now' };

/**
 * Lets people change the period the whole app shows. It shows the period the queries are running
 * with, which is the app's own, or the dashboard's, and where it is changed is up to where the app
 * is shown. Without anywhere to change it, it is shown and cannot be used.
 */
export const TimeRangeNode = ({ node }: { node: AppNodeOfType<'time_range'> }) => {
  const layer = useDataLayer();
  const control = useTimeRangeControl();
  const timeRange = useSubjectValue(layer.context$)?.timeRange ?? FALLBACK;

  const onTimeChange = useCallback(
    ({ start, end }: OnTimeChangeProps) => control?.setTimeRange({ from: start, to: end }),
    [control]
  );

  return (
    // At the right of whatever it is in, whether that is a row of filters or the width of the app.
    <div
      data-node-id={node.id}
      data-test-subj="customAppTimeRange"
      css={css({ display: 'flex', justifyContent: 'flex-end' })}
    >
      <EuiSuperDatePicker
        compressed
        start={timeRange.from}
        end={timeRange.to}
        onTimeChange={onTimeChange}
        showUpdateButton={false}
        isDisabled={!control}
        aria-label={i18n.translate('xpack.customApp.timeRangeNode.label', {
          defaultMessage: 'Time range of the app',
        })}
      />
    </div>
  );
};
