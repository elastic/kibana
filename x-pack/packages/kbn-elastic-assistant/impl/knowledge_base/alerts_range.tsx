/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiRange, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import {
  MAX_LATEST_ALERTS,
  MIN_LATEST_ALERTS,
  TICK_INTERVAL,
} from '../assistant/settings/alerts_settings/alerts_settings';
import { KnowledgeBaseConfig } from '../assistant/types';
import { ALERTS_RANGE } from './translations';

export type SingleRangeChangeEvent =
  | React.ChangeEvent<HTMLInputElement>
  | React.KeyboardEvent<HTMLInputElement>
  | React.MouseEvent<HTMLButtonElement>;

interface Props {
  compressed?: boolean;
  maxAlerts?: number;
  minAlerts?: number;
  onChange?: (e: SingleRangeChangeEvent) => void;
  knowledgeBase?: KnowledgeBaseConfig;
  setUpdatedKnowledgeBaseSettings?: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
  step?: number;
  value: string | number;
}

const MAX_ALERTS_RANGE_WIDTH = 649; // px

export const AlertsRange: React.FC<Props> = React.memo(
  ({
    compressed = true,
    knowledgeBase,
    maxAlerts = MAX_LATEST_ALERTS,
    minAlerts = MIN_LATEST_ALERTS,
    onChange,
    setUpdatedKnowledgeBaseSettings,
    step = TICK_INTERVAL,
    value,
  }) => {
    const inputRangeSliderId = useGeneratedHtmlId({ prefix: 'inputRangeSlider' });

    const handleOnChange = useCallback(
      (e: SingleRangeChangeEvent) => {
        if (knowledgeBase != null && setUpdatedKnowledgeBaseSettings != null) {
          setUpdatedKnowledgeBaseSettings({
            ...knowledgeBase,
            latestAlerts: Number(e.currentTarget.value),
          });
        }

        if (onChange != null) {
          onChange(e);
        }
      },
      [knowledgeBase, onChange, setUpdatedKnowledgeBaseSettings]
    );

    return (
      <EuiRange
        aria-label={ALERTS_RANGE}
        fullWidth
        compressed={compressed}
        css={css`
          max-inline-size: ${MAX_ALERTS_RANGE_WIDTH}px;
          & .euiRangeTrack {
            margin-inline-start: 0;
            margin-inline-end: 0;
          }
        `}
        data-test-subj="alertsRange"
        id={inputRangeSliderId}
        max={maxAlerts}
        min={minAlerts}
        onChange={handleOnChange}
        showTicks
        step={step}
        value={value}
      />
    );
  }
);

AlertsRange.displayName = 'AlertsRange';
