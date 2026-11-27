/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { formatDuration } from '../shared';
import { formatStageTime } from './activity_helpers';
import type { StageSummary } from './activity_helpers';
import * as i18n from './translations';

export interface StageStripProps {
  stages: readonly StageSummary[];
  onSelectStage: (stage: StageSummary) => void;
}

/** The stages of the security events in order, with the time between them. */
export const StageStrip: React.FC<StageStripProps> = ({ stages, onSelectStage }) => {
  if (stages.length === 0) {
    return null;
  }

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder data-test-subj="investigationStageStrip">
      <EuiFlexGroup gutterSize="s" alignItems="baseline" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{i18n.STAGES_TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.STAGES_SUBTITLE(formatStageTime(stages[0].ts))}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="s" alignItems="stretch" wrap responsive={false}>
        {stages.map((stage, index) => (
          <React.Fragment key={stage.stage}>
            {index > 0 ? (
              <EuiFlexItem
                grow={false}
                css={css`
                  justify-content: center;
                `}
              >
                <EuiText size="xs" color="subdued">
                  +{formatDuration(stage.ts - stages[index - 1].ts)}
                </EuiText>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <EuiPanel
                paddingSize="s"
                hasShadow={false}
                hasBorder
                onClick={() => onSelectStage(stage)}
                aria-label={i18n.STAGE_OPEN(stage.stage)}
                data-test-subj={`investigationStage-${stage.stage}`}
              >
                <EuiText size="s">
                  <strong>{stage.stage}</strong>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  {formatStageTime(stage.ts)}
                </EuiText>
                <EuiText size="xs" color="subdued">
                  {stage.firstEvent.timeline_event.mitre ?? i18n.STAGE_NO_MITRE}
                </EuiText>
                <EuiBadge color={stage.suspected ? 'warning' : 'danger'}>
                  {stage.suspected ? i18n.STAGE_SUSPECTED : i18n.STAGE_CONFIRMED}
                </EuiBadge>
              </EuiPanel>
            </EuiFlexItem>
          </React.Fragment>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
StageStrip.displayName = 'StageStrip';
