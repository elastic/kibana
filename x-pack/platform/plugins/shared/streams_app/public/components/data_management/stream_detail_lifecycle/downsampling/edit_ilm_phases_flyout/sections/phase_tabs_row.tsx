/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTab,
  EuiTabs,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';

import { IlmPhaseSelect } from '../../ilm_phase_select/ilm_phase_select';
import type { IlmPhasesFlyoutFormInternal, TimeUnit } from '../form';
import { toMilliseconds } from '../form';
import { DEFAULT_NEW_PHASE_MIN_AGE, PHASE_LABELS } from '../constants';

export interface PhaseTabsRowProps {
  form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
  enabledPhases: PhaseName[];
  searchableSnapshotRepositories: string[];
  canCreateRepository: boolean;
  selectedIlmPhase: PhaseName | undefined;
  setSelectedIlmPhase: React.Dispatch<React.SetStateAction<PhaseName | undefined>>;
  pendingSelectedIlmPhaseRef: React.MutableRefObject<PhaseName | null>;
  tabHasErrors: (phaseName: PhaseName) => boolean;
  dataTestSubj: string;
}

export const PhaseTabsRow = ({
  form,
  enabledPhases,
  searchableSnapshotRepositories,
  canCreateRepository,
  selectedIlmPhase,
  setSelectedIlmPhase,
  pendingSelectedIlmPhaseRef,
  tabHasErrors,
  dataTestSubj,
}: PhaseTabsRowProps) => {
  const canSelectFrozen = canCreateRepository || searchableSnapshotRepositories.length > 0;
  const excludedPhases = useMemo(
    () => (canSelectFrozen ? [] : (['frozen'] as PhaseName[])),
    [canSelectFrozen]
  );

  const getDefaultMinAge = useCallback((): { value: string; unit: TimeUnit } => {
    const candidates: Array<'warm' | 'cold' | 'frozen' | 'delete'> = [
      'warm',
      'cold',
      'frozen',
      'delete',
    ];
    let last: { value: string; unit: TimeUnit } | undefined;

    candidates.forEach((p) => {
      const enabled = Boolean(form.getFields()[`_meta.${p}.enabled`]?.value);
      if (!enabled) return;

      const value = String(form.getFields()[`_meta.${p}.minAgeValue`]?.value ?? '').trim();
      const unit = (form.getFields()[`_meta.${p}.minAgeUnit`]?.value ?? 'd') as TimeUnit;

      if (value) {
        last = { value, unit };
      }
    });

    return last ?? DEFAULT_NEW_PHASE_MIN_AGE;
  }, [form]);

  const onSelectPhase = useCallback(
    (phase: PhaseName) => {
      if (enabledPhases.includes(phase)) {
        pendingSelectedIlmPhaseRef.current = null;
        setSelectedIlmPhase(phase);
        return;
      }

      pendingSelectedIlmPhaseRef.current = phase;
      form.setFieldValue(`_meta.${phase}.enabled`, true);

      if (phase === 'frozen' && searchableSnapshotRepositories.length === 1) {
        const repositoryField = form.getFields()['_meta.searchableSnapshot.repository'];
        const currentValue = String(repositoryField?.value ?? '').trim();
        if (repositoryField && currentValue === '') {
          repositoryField.setValue(searchableSnapshotRepositories[0]);
        }
      }

      if (phase !== 'hot') {
        const valuePath = `_meta.${phase}.minAgeValue`;
        const unitPath = `_meta.${phase}.minAgeUnit`;
        const millisPath = `_meta.${phase}.minAgeToMilliSeconds`;

        const valueField = form.getFields()[valuePath];
        const unitField = form.getFields()[unitPath];

        // When enabling a previously-disabled phase, preserve existing values.
        // Otherwise default to the last configured min_age (or 30d).
        if (valueField && String(valueField.value ?? '').trim() === '') {
          const { value: defaultValue, unit: defaultUnit } = getDefaultMinAge();
          valueField.setValue(defaultValue);
          unitField?.setValue(defaultUnit);
        }

        const resolvedValue = String(form.getFields()[valuePath]?.value ?? '');
        const resolvedUnit = String(form.getFields()[unitPath]?.value ?? 'd') as TimeUnit;
        const millis =
          resolvedValue.trim() === '' ? -1 : toMilliseconds(resolvedValue, resolvedUnit);
        form.setFieldValue(millisPath, millis);
      }

      setSelectedIlmPhase(phase);
    },
    [
      enabledPhases,
      form,
      getDefaultMinAge,
      pendingSelectedIlmPhaseRef,
      searchableSnapshotRepositories,
      setSelectedIlmPhase,
    ]
  );

  const tabs = useMemo(() => {
    return enabledPhases.map((phaseName) => (
      <EuiTab
        key={phaseName}
        onClick={() => setSelectedIlmPhase(phaseName)}
        isSelected={phaseName === selectedIlmPhase}
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
  }, [dataTestSubj, enabledPhases, selectedIlmPhase, setSelectedIlmPhase, tabHasErrors]);

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTabs bottomBorder={false}>{tabs}</EuiTabs>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IlmPhaseSelect
          selectedPhases={enabledPhases}
          excludedPhases={excludedPhases}
          onSelect={onSelectPhase}
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
