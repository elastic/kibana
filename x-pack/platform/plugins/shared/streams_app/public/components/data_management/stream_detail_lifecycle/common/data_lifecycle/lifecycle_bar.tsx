/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LifecyclePhase } from './lifecycle_types';
import { LifecyclePhase as LifecyclePhaseComponent } from './lifecycle_phase';

interface LifecycleBarProps {
  phases: LifecyclePhase[];
  gridTemplateColumns: string;
  phaseColumnSpans: number[];
  onPhaseClick?: (phase: LifecyclePhase, index: number) => void;
}

const renderLifecyclePhase = (
  phase: LifecyclePhase,
  index: number,
  onPhaseClick?: (phase: LifecyclePhase, index: number) => void
) => {
  const commonProps = {
    label: phase.label,
    onClick: () => {
      onPhaseClick?.(phase, index);
    },
    description: phase.description,
    minAge: phase.min_age,
    isReadOnly: phase.isReadOnly,
  };

  return phase.isDelete ? (
    <LifecyclePhaseComponent isDelete {...commonProps} />
  ) : (
    <LifecyclePhaseComponent
      {...commonProps}
      color={phase.color}
      size={phase.size}
      sizeInBytes={phase.sizeInBytes}
      docsCount={phase.docsCount}
      searchableSnapshot={phase.searchableSnapshot}
    />
  );
};

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
              {renderLifecyclePhase(phase, index, onPhaseClick)}
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiPanel>
    </>
  );
};
