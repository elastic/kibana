/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PipelineStepId } from './build_pipeline_steps';

/** Tiny bar heights used as a static metaphor — not live metrics. */
const BARS: Record<PipelineStepId, number[]> = {
  base: [40, 55, 48, 62, 50, 58, 45],
  alert: [30, 45, 85, 90, 40, 95, 35],
  recovery: [90, 80, 55, 35, 28, 22, 18],
  noData: [50, 50, 50, 10, 0, 0, 0],
};

const THRESHOLD_LINE: Partial<Record<PipelineStepId, number>> = {
  alert: 70,
  recovery: 40,
};

/**
 * Lightweight visual aid next to the query — static sparkline metaphor per step.
 */
export const StepVisual = ({
  stepId,
  label,
}: {
  stepId: PipelineStepId;
  label?: string;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const bars = BARS[stepId];
  const threshold = THRESHOLD_LINE[stepId];

  const caption = useMemo(() => {
    switch (stepId) {
      case 'base':
        return (
          <FormattedMessage
            id="xpack.alertingV2.queryPipelineExplainer.visual.baseCaption"
            defaultMessage="Rows returned by the base query"
          />
        );
      case 'alert':
        return (
          <FormattedMessage
            id="xpack.alertingV2.queryPipelineExplainer.visual.alertCaption"
            defaultMessage="Series above the alert condition"
          />
        );
      case 'recovery':
        return (
          <FormattedMessage
            id="xpack.alertingV2.queryPipelineExplainer.visual.recoveryCaption"
            defaultMessage="Series falling back under the recovery condition"
          />
        );
      case 'noData':
        return (
          <FormattedMessage
            id="xpack.alertingV2.queryPipelineExplainer.visual.noDataCaption"
            defaultMessage="Gaps when a group stops returning data"
          />
        );
    }
  }, [stepId]);

  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      color="subdued"
      data-test-subj={`queryPipelineVisual-${stepId}`}
    >
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <div
            aria-hidden
            css={css`
              display: flex;
              align-items: flex-end;
              gap: 3px;
              block-size: 40px;
              position: relative;
            `}
          >
            {threshold != null ? (
              <div
                css={css`
                  position: absolute;
                  inset-inline: 0;
                  inset-block-end: ${(threshold / 100) * 40}px;
                  border-block-start: 1px dashed ${euiTheme.colors.borderBaseDanger};
                  opacity: 0.85;
                `}
              />
            ) : null}
            {bars.map((h, i) => {
              const above =
                stepId === 'alert'
                  ? h >= (threshold ?? 0)
                  : stepId === 'recovery'
                  ? h <= (threshold ?? 100)
                  : stepId === 'noData'
                  ? h === 0
                  : false;
              return (
                <div
                  key={i}
                  css={css`
                    inline-size: 8px;
                    block-size: ${h}%;
                    min-block-size: 2px;
                    border-radius: 2px;
                    background: ${above
                      ? euiTheme.colors.backgroundFilledPrimary
                      : euiTheme.colors.backgroundFilledText};
                    opacity: ${above ? 1 : 0.45};
                  `}
                />
              );
            })}
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          {label ? (
            <EuiText size="xs">
              <strong>{label}</strong>
            </EuiText>
          ) : null}
          <EuiText size="xs" color="subdued">
            <p css={css`margin-block: 0;`}>{caption}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
