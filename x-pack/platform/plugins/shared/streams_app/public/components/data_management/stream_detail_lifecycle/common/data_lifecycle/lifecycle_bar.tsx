/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
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
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="xs"
      css={{
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        borderRadius: euiTheme.border.radius.small,
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
              phaseColorHover={phase.colorHover}
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
  );
};
