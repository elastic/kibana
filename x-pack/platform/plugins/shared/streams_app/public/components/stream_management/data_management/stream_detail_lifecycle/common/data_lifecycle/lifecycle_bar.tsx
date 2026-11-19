/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  type EuiThemeComputed,
} from '@elastic/eui';
import type { CSSObject } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { LifecyclePhase } from './lifecycle_types';
import { LifecyclePhase as LifecyclePhaseComponent } from './lifecycle_phase';
import type { FrozenPhaseCallouts } from './data_lifecycle_summary';
import type { StablePhaseSlot } from './stable_phase_columns';
import { useGridColumnsTransitionCss, getSegmentFadeInCss } from './lifecycle_bar_animations';

export interface LifecycleBarProps {
  phases: LifecyclePhase[];
  gridTemplateColumns: string;
  phaseColumnSpans: number[];
  stableSlots?: StablePhaseSlot[];
  animateGridChanges?: boolean;
  onPhaseClick?: (phase: LifecyclePhase, index: number) => void;
  testSubjPrefix?: string;
  showPhaseActions?: boolean;
  onRemovePhase?: (phaseName: string) => void;
  onEditPhase?: (phaseName: string) => void;
  shouldShowEditPhaseAction?: (phaseName: string) => boolean;
  shouldShowRemovePhaseAction?: (phaseName: string) => boolean;
  editedPhaseName?: string;
  canManageLifecycle: boolean;
  isEditLifecycleFlyoutOpen?: boolean;
  /** While true, all click interactions are disabled: no popover opens and no navigation occurs. */
  disableInteractions?: boolean;
  frozenPhaseCallouts?: FrozenPhaseCallouts;
}

// A grid cell normalized from either the stable-slot or dynamic layout. `phase` is null for an absent
// stable slot (rendered as an empty placeholder).
interface RenderableSegment {
  key: string | number;
  grow: LifecyclePhase['grow'];
  gridColumn: string;
  hasPadding: boolean;
  phase: LifecyclePhase | null;
  phaseIndex: number;
}

const getPhaseSegmentCss = (
  euiTheme: EuiThemeComputed,
  gridColumn: string,
  hasPadding: boolean
): CSSObject => ({
  display: 'flex',
  flexBasis: 0,
  minWidth: 0,
  overflow: 'hidden',
  gridColumn,
  // No padding for absent slots (so `0fr` tracks collapse) nor delete (so its 50px button fits).
  paddingInline: hasPadding ? euiTheme.size.xxs : 0,
  boxSizing: 'border-box',
  justifyContent: 'center',
  height: '100%',
});

const renderLifecyclePhase = (
  index: number,
  phase: LifecyclePhase,
  onPhaseClick?: (phase: LifecyclePhase, index: number) => void,
  showPhaseActions?: boolean,
  onRemovePhase?: (phaseName: string) => void,
  onEditPhase?: (phaseName: string) => void,
  shouldShowEditPhaseAction?: (phaseName: string) => boolean,
  shouldShowRemovePhaseAction?: (phaseName: string) => boolean,
  editedPhaseName?: string,
  canManageLifecycle?: boolean,
  isEditLifecycleFlyoutOpen?: boolean,
  disableInteractions?: boolean,
  testSubjPrefix?: string,
  frozenPhaseCallouts?: FrozenPhaseCallouts
) => {
  // Use the stable schema name (not the localized label) for identity: frozen's label is translated
  // but its name is always 'frozen'.
  const shouldShowEdit = shouldShowEditPhaseAction ? shouldShowEditPhaseAction(phase.name) : true;
  const shouldShowRemove = shouldShowRemovePhaseAction
    ? shouldShowRemovePhaseAction(phase.name)
    : true;
  const commonProps = {
    description: phase.description,
    isReadOnly: phase.isReadOnly,
    isRemoveDisabled: phase.isRemoveDisabled,
    removeDisabledReason: phase.removeDisabledReason,
    name: phase.name,
    label: phase.label,
    onClick: () => {
      onPhaseClick?.(phase, index);
    },
    showActions: showPhaseActions,
    minAge: phase.min_age,
    testSubjPrefix,
    onRemovePhase: shouldShowRemove ? onRemovePhase : undefined,
    onEditPhase: shouldShowEdit ? onEditPhase : undefined,
    isBeingEdited: Boolean(editedPhaseName && editedPhaseName === phase.label),
    canManageLifecycle: canManageLifecycle ?? false,
    isEditLifecycleFlyoutOpen,
    disableInteractions,
  };

  const isFrozenPhase = phase.name === 'frozen';

  return phase.isDelete ? (
    <LifecyclePhaseComponent isDelete {...commonProps} />
  ) : (
    <LifecyclePhaseComponent
      {...commonProps}
      color={phase.color}
      docsCount={phase.docsCount}
      size={phase.size}
      sizeInBytes={phase.sizeInBytes}
      searchableSnapshot={phase.searchableSnapshot}
      {...(isFrozenPhase && frozenPhaseCallouts ? frozenPhaseCallouts : {})}
    />
  );
};

export const LifecycleBar: React.FC<LifecycleBarProps> = ({
  phases,
  gridTemplateColumns,
  phaseColumnSpans,
  stableSlots,
  animateGridChanges = true,
  onPhaseClick,
  testSubjPrefix,
  showPhaseActions,
  onRemovePhase,
  onEditPhase,
  shouldShowEditPhaseAction,
  shouldShowRemovePhaseAction,
  editedPhaseName,
  canManageLifecycle,
  isEditLifecycleFlyoutOpen,
  disableInteractions,
  frozenPhaseCallouts,
}) => {
  const { euiTheme } = useEuiTheme();
  const gridColumnsTransitionCss = useGridColumnsTransitionCss(
    euiTheme,
    gridTemplateColumns,
    animateGridChanges
  );
  const segmentFadeInCss = getSegmentFadeInCss(euiTheme);

  // Stable slots render every canonical slot (absent ones as placeholders); the dynamic layout renders
  // only configured phases. Both normalize to the same shape.
  const segments: RenderableSegment[] = stableSlots
    ? stableSlots.map(({ slot, phase, phaseIndex, columnStart }) => ({
        key: slot,
        grow: phase?.grow ?? false,
        gridColumn: `${columnStart} / span 1`,
        hasPadding: Boolean(phase && !phase.isDelete),
        phase,
        phaseIndex: phaseIndex ?? 0,
      }))
    : phases.map((phase, index) => ({
        key: phase.name ?? phase.label ?? index,
        grow: phase.grow,
        gridColumn: `span ${phaseColumnSpans[index]}`,
        hasPadding: !phase.isDelete,
        phase,
        phaseIndex: index,
      }));

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
          height: '56px',
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          borderRadius: '8px',
          padding: '4px 2px',
        }}
      >
        <EuiFlexGrid
          columns={1}
          gutterSize="none"
          responsive={false}
          css={[
            {
              gridTemplateColumns,
              boxSizing: 'border-box',
              height: '100%',
            },
            gridColumnsTransitionCss,
          ]}
        >
          {segments.map(({ key, grow, gridColumn, hasPadding, phase, phaseIndex }) => (
            <EuiFlexItem
              key={key}
              grow={grow}
              css={[getPhaseSegmentCss(euiTheme, gridColumn, hasPadding), segmentFadeInCss]}
            >
              {phase
                ? renderLifecyclePhase(
                    phaseIndex,
                    phase,
                    onPhaseClick,
                    showPhaseActions,
                    onRemovePhase,
                    onEditPhase,
                    shouldShowEditPhaseAction,
                    shouldShowRemovePhaseAction,
                    editedPhaseName,
                    canManageLifecycle,
                    isEditLifecycleFlyoutOpen,
                    disableInteractions,
                    testSubjPrefix,
                    frozenPhaseCallouts
                  )
                : null}
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiPanel>
    </>
  );
};
