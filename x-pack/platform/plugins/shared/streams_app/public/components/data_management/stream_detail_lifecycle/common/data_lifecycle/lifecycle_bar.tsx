/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LifecyclePhase } from './data_lifecycle_summary';
import { LifecyclePhase as LifecyclePhaseComponent } from './lifecycle_phase';

interface LifecycleBarProps {
  phases: LifecyclePhase[];
  gridTemplateColumns: string;
  phaseColumnSpans: number[];
  onPhaseClick?: (phase: LifecyclePhase, index: number) => void;
}

export const LifecycleBar = ({
  phases,
  gridTemplateColumns,
  phaseColumnSpans,
  onPhaseClick,
}: LifecycleBarProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.streams.dataLifecycleSummary.panelLabel', {
          defaultMessage: 'Data phases',
        })}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        css={{
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          borderRadius: '8px',
          padding: '4px 2px',
        }}
      >
        <EuiFlexGrid
          columns={1}
          gutterSize="none"
          responsive={false}
          css={{
            gridTemplateColumns,
            paddingInline: euiTheme.size.xxs,
            boxSizing: 'border-box',
          }}
        >
          {phases.map((phase, index) => (
            <EuiFlexItem
              key={index}
              grow={phase.grow}
              css={{
                display: 'flex',
                flexBasis: 0,
                minWidth: 0,
                gridColumn: `span ${phaseColumnSpans[index]}`,
                paddingBlock: euiTheme.size.xxs,
                paddingInline: euiTheme.size.xxs,
                boxSizing: 'border-box',
                justifyContent: 'center',
              }}
            >
              <LifecyclePhaseComponent
                color={phase.color}
                label={phase.label}
                size={phase.size}
                isDelete={phase.isDelete}
                onClick={() => {
                  onPhaseClick?.(phase, index);
                }}
                description={phase.description}
                sizeInBytes={phase.sizeInBytes}
                docsCount={phase.docsCount}
                minAge={phase.min_age}
                isReadOnly={phase.isReadOnly}
                searchableSnapshot={phase.searchableSnapshot}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiPanel>
    </>
  );
};
