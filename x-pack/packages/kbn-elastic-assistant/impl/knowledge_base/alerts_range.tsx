/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiRange, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import {
  MAX_LATEST_ALERTS,
  MIN_LATEST_ALERTS,
  TICK_INTERVAL,
} from '../alerts/settings/alerts_settings';
import { KnowledgeBaseConfig } from '../assistant/types';
import { ALERTS_RANGE } from './translations';

interface Props {
  knowledgeBase: KnowledgeBaseConfig;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
  compressed?: boolean;
}

const MAX_ALERTS_RANGE_WIDTH = 649; // px

export const AlertsRange: React.FC<Props> = React.memo(
  ({ knowledgeBase, setUpdatedKnowledgeBaseSettings, compressed = true }) => {
    const inputRangeSliderId = useGeneratedHtmlId({ prefix: 'inputRangeSlider' });

    return (
      <EuiRange
        aria-label={ALERTS_RANGE}
        compressed={compressed}
        data-test-subj="alertsRange"
        id={inputRangeSliderId}
        max={MAX_LATEST_ALERTS}
        min={MIN_LATEST_ALERTS}
        onChange={(e) =>
          setUpdatedKnowledgeBaseSettings({
            ...knowledgeBase,
            latestAlerts: Number(e.currentTarget.value),
          })
        }
        showTicks
        step={TICK_INTERVAL}
        value={knowledgeBase.latestAlerts}
        css={css`
          max-inline-size: ${MAX_ALERTS_RANGE_WIDTH}px;
          & .euiRangeTrack {
            margin-inline-start: 0;
            margin-inline-end: 0;
          }
        `}
      />
    );
  }
);

AlertsRange.displayName = 'AlertsRange';
