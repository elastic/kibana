/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
import { css } from '@emotion/react';

import { IlmPhaseSelect } from '../../ilm_phase_select/ilm_phase_select';
import { PHASE_LABELS } from '../constants';

export interface PhaseTabsRowProps {
  enabledPhases: PhaseName[];
  searchableSnapshotRepositories: string[];
  canCreateRepository: boolean;
  selectedPhase: PhaseName | undefined;
  setSelectedPhase: (phase: PhaseName | undefined) => void;
  tabHasErrors: (phaseName: PhaseName) => boolean;
  dataTestSubj: string;
}

export const PhaseTabsRow = ({
  enabledPhases,
  searchableSnapshotRepositories,
  canCreateRepository,
  selectedPhase,
  setSelectedPhase,
  tabHasErrors,
  dataTestSubj,
}: PhaseTabsRowProps) => {
  const canSelectFrozen = canCreateRepository || searchableSnapshotRepositories.length > 0;
  const excludedPhases = useMemo(
    () => (canSelectFrozen ? [] : (['frozen'] as PhaseName[])),
    [canSelectFrozen]
  );

  const tabs = useMemo(() => {
    return enabledPhases.map((phaseName) => (
      <EuiTab
        key={phaseName}
        onClick={() => setSelectedPhase(phaseName)}
        isSelected={phaseName === selectedPhase}
        data-test-subj={`${dataTestSubj}Tab-${phaseName}`}
        prepend={
          tabHasErrors(phaseName) ? <EuiIcon type="warning" color="danger" size="m" /> : undefined
        }
      >
        {tabHasErrors(phaseName) ? (
          <EuiTextColor color="danger">{PHASE_LABELS[phaseName]}</EuiTextColor>
        ) : (
          PHASE_LABELS[phaseName]
        )}
      </EuiTab>
    ));
  }, [dataTestSubj, enabledPhases, selectedPhase, setSelectedPhase, tabHasErrors]);

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiFlexItem
        grow={false}
        css={css`
          ${useEuiOverflowScroll('x', true)}
        `}
      >
        <EuiTabs bottomBorder={false}>{tabs}</EuiTabs>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IlmPhaseSelect
          selectedPhases={enabledPhases}
          excludedPhases={excludedPhases}
          onSelect={setSelectedPhase}
          renderButton={(buttonProps) => {
            const button = (
              <EuiButtonIcon
                {...buttonProps}
                display="empty"
                iconType="plus"
                aria-label={i18n.translate('xpack.streams.editIlmPhasesFlyout.addPhaseAriaLabel', {
                  defaultMessage: 'Add data phase',
                })}
                size="xs"
                color="primary"
                data-test-subj={`${dataTestSubj}AddTabButton`}
              />
            );

            if (!buttonProps.disabled) {
              return button;
            }

            return (
              <EuiToolTip
                position="top"
                content={i18n.translate('xpack.streams.editIlmPhasesFlyout.allPhasesInUseTooltip', {
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
