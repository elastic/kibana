/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { PhaseName } from '@kbn/streams-schema';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTab,
  EuiTabs,
  EuiTextColor,
  EuiToolTip,
  useEuiOverflowScroll,
} from '@elastic/eui';

import { PHASE_NAMES } from '@kbn/data-lifecycle-phases';
import { IlmPhaseSelect } from '../ilm_phase_select/ilm_phase_select';
import { useDataPhasesFlyoutStyles } from './use_data_phases_flyout_styles';

interface PhaseTabProps {
  phaseName: PhaseName;
  isSelected: boolean;
  onSelect: (phaseName: PhaseName) => void;
  hasErrors: boolean;
  hasWarnings: boolean;
  disabled: boolean;
  tooltipMessage?: string;
  dataTestSubj: string;
}

const PhaseTab = ({
  phaseName,
  isSelected,
  onSelect,
  hasErrors,
  hasWarnings,
  disabled,
  tooltipMessage,
  dataTestSubj,
}: PhaseTabProps) => {
  const className = hasErrors
    ? 'streamsIlmPhasesTab--hasErrors'
    : hasWarnings
    ? 'streamsIlmPhasesTab--hasWarnings'
    : undefined;

  const prepend = hasErrors ? (
    <EuiIcon
      type="warning"
      color="danger"
      size="m"
      aria-label={i18n.translate('xpack.streams.phaseTabsRow.phaseTabHasErrorsIconAriaLabel', {
        defaultMessage: '{phase} phase has errors',
        values: { phase: PHASE_NAMES[phaseName] },
      })}
    />
  ) : hasWarnings ? (
    <EuiIcon
      type="warning"
      color="warning"
      size="m"
      aria-label={i18n.translate('xpack.streams.phaseTabsRow.phaseTabHasWarningsIconAriaLabel', {
        defaultMessage: '{phase} phase requires attention',
        values: { phase: PHASE_NAMES[phaseName] },
      })}
    />
  ) : undefined;

  const label = hasErrors ? (
    <EuiTextColor color="danger">{PHASE_NAMES[phaseName]}</EuiTextColor>
  ) : hasWarnings ? (
    <EuiTextColor color="warning">{PHASE_NAMES[phaseName]}</EuiTextColor>
  ) : (
    PHASE_NAMES[phaseName]
  );

  const tab = (
    <EuiTab
      onClick={() => {
        if (disabled) return;
        onSelect(phaseName);
      }}
      isSelected={isSelected}
      disabled={disabled}
      className={className}
      data-test-subj={`${dataTestSubj}Tab-${phaseName}`}
      prepend={prepend}
    >
      {label}
    </EuiTab>
  );

  if (!tooltipMessage) {
    return tab;
  }

  return (
    <EuiToolTip content={tooltipMessage}>
      <span tabIndex={0}>{tab}</span>
    </EuiToolTip>
  );
};

export interface PhaseTabsRowProps {
  enabledPhases: PhaseName[];
  searchableSnapshotRepositories: string[];
  canCreateRepository: boolean;
  excludedPhases?: PhaseName[];
  disabledPhaseTooltips?: Partial<Record<PhaseName, string>>;
  selectedPhase: PhaseName | undefined;
  setSelectedPhase: (phase: PhaseName | undefined) => void;
  tabHasErrors: (phaseName: PhaseName) => boolean;
  warningPhases?: PhaseName[];
  disabledPhases?: PhaseName[];
  disableAddPhaseButton?: boolean;
  showEnterpriseLicenseRequiredBadge?: boolean;
  showDefaultRepositoryRequiredBadge?: boolean;
  dataTestSubj: string;
}

export const PhaseTabsRow = ({
  enabledPhases,
  searchableSnapshotRepositories,
  canCreateRepository,
  excludedPhases: excludedPhasesProp = [],
  disabledPhaseTooltips = {},
  selectedPhase,
  setSelectedPhase,
  tabHasErrors,
  warningPhases = [],
  disabledPhases = [],
  disableAddPhaseButton = false,
  showEnterpriseLicenseRequiredBadge = false,
  showDefaultRepositoryRequiredBadge = false,
  dataTestSubj,
}: PhaseTabsRowProps) => {
  const tabsScrollCss = useEuiOverflowScroll('x');
  const { tabsErrorSelectedUnderlineStyles, tabsWarningSelectedUnderlineStyles } =
    useDataPhasesFlyoutStyles();
  const tabRefs = useRef<Partial<Record<PhaseName, HTMLSpanElement | null>>>({});

  const canSelectFrozen = canCreateRepository || searchableSnapshotRepositories.length > 0;
  const excludedPhases = useMemo(() => {
    const frozenExcluded = canSelectFrozen ? [] : (['frozen'] as PhaseName[]);
    return [...excludedPhasesProp, ...frozenExcluded];
  }, [canSelectFrozen, excludedPhasesProp]);

  // Avoid memoizing tabs based on `tabHasErrors` identity. RHF can update `errors` by mutation, and
  // we want each render to re-evaluate the current tab error state.
  const tabs = enabledPhases.map((phaseName) => (
    // Use a wrapper element for tooltips + scrollIntoView ref.
    <span
      key={phaseName}
      ref={(node) => {
        tabRefs.current[phaseName] = node;
        if (node && selectedPhase === phaseName) {
          node.scrollIntoView?.({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
          });
        }
      }}
    >
      <PhaseTab
        phaseName={phaseName}
        isSelected={phaseName === selectedPhase}
        onSelect={(phase) => setSelectedPhase(phase)}
        hasErrors={tabHasErrors(phaseName)}
        hasWarnings={!tabHasErrors(phaseName) && warningPhases.includes(phaseName)}
        disabled={disabledPhases.includes(phaseName)}
        tooltipMessage={disabledPhaseTooltips[phaseName]}
        dataTestSubj={dataTestSubj}
      />
    </span>
  ));

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiFlexItem
        grow={false}
        css={[tabsScrollCss, tabsErrorSelectedUnderlineStyles, tabsWarningSelectedUnderlineStyles]}
      >
        <EuiTabs bottomBorder={false}>{tabs}</EuiTabs>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IlmPhaseSelect
          selectedPhases={enabledPhases}
          excludedPhases={excludedPhases}
          onSelect={setSelectedPhase}
          disabled={disableAddPhaseButton}
          showEnterpriseLicenseRequiredBadge={showEnterpriseLicenseRequiredBadge}
          showDefaultRepositoryRequiredBadge={showDefaultRepositoryRequiredBadge}
          renderButton={({ disabled, ...buttonProps }) => {
            const isAddDisabled = disableAddPhaseButton || disabled;
            const button = (
              <EuiButtonIcon
                {...buttonProps}
                isDisabled={isAddDisabled}
                disabled={isAddDisabled}
                display="empty"
                iconType="plus"
                aria-label={i18n.translate('xpack.streams.phaseTabsRow.addPhaseAriaLabel', {
                  defaultMessage: 'Add data phase',
                })}
                size="xs"
                color="text"
                data-test-subj={`${dataTestSubj}AddTabButton`}
              />
            );

            if (!isAddDisabled) {
              return button;
            }

            return (
              <EuiToolTip
                position="top"
                content={i18n.translate('xpack.streams.phaseTabsRow.allPhasesInUseTooltip', {
                  defaultMessage: 'All data phases are in use',
                })}
              >
                <span tabIndex={0}>{button}</span>
              </EuiToolTip>
            );
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
