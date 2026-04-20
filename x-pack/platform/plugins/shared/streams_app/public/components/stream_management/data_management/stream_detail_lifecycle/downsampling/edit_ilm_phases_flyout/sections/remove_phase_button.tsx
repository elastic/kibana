/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiButton } from '@elastic/eui';
import type { IlmPhasesFlyoutFormInternal } from '../form';

export interface RemovePhaseButtonProps {
  form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
  phaseName: PhaseName | undefined;
  enabledPhases: PhaseName[];
  dataTestSubj: string;
  setSelectedPhase: (phase: PhaseName | undefined) => void;
}

export const RemovePhaseButton = ({
  form,
  phaseName,
  enabledPhases,
  dataTestSubj,
  setSelectedPhase,
}: RemovePhaseButtonProps) => {
  if (!phaseName) return null;
  if (phaseName === 'hot') return null;

  const getFieldsToRevalidateAfterDisable = (phase: PhaseName): string[] => {
    const minAgePath = (p: Exclude<PhaseName, 'hot'>) => `_meta.${p}.minAgeValue`;
    const downsampleIntervalPath = (p: 'hot' | 'warm' | 'cold') =>
      `_meta.${p}.downsample.fixedIntervalValue`;

    const fields: string[] = [];

    // Clear errors on the disabled phase itself.
    if (phase !== 'hot') {
      fields.push(minAgePath(phase));
    }
    if (phase === 'hot' || phase === 'warm' || phase === 'cold') {
      fields.push(downsampleIntervalPath(phase));
    }

    // Clear errors on phases whose validations depend on the removed one.
    if (phase === 'hot') {
      fields.push(downsampleIntervalPath('warm'), downsampleIntervalPath('cold'));
    }
    if (phase === 'warm') {
      fields.push(minAgePath('cold'), minAgePath('frozen'), minAgePath('delete'));
      fields.push(downsampleIntervalPath('cold'));
    }
    if (phase === 'cold') {
      fields.push(minAgePath('frozen'), minAgePath('delete'));
      fields.push('_meta.searchableSnapshot.repository');
    }
    if (phase === 'frozen') {
      fields.push(minAgePath('delete'));
      fields.push('_meta.searchableSnapshot.repository');
    }

    return fields;
  };

  const enabledPath = `_meta.${phaseName}.enabled`;
  const enabledField = form.getFields()[enabledPath];
  if (!enabledField) return null;

  const hotEnabled = enabledPhases.includes('hot');
  const nonDeleteEnabledPhases = enabledPhases.filter((p) => p !== 'delete');
  const isOnlyDeletePhaseEnabled = enabledPhases.length === 1 && enabledPhases[0] === 'delete';
  const isLastNonDeletePhaseWithoutHot =
    !hotEnabled && phaseName !== 'delete' && nonDeleteEnabledPhases.length === 1;

  const isRemoveDisabled =
    (phaseName === 'delete' && isOnlyDeletePhaseEnabled) || isLastNonDeletePhaseWithoutHot;

  return (
    <EuiButton
      color="danger"
      size="s"
      data-test-subj={`${dataTestSubj}RemoveItemButton`}
      disabled={isRemoveDisabled}
      onClick={() => {
        enabledField.setValue(false);

        // Delay to the next tick so `hook_form_lib` propagates the enabled toggle change into
        // the flattened `formData` snapshot that validators read from.
        const fieldsToRevalidate = getFieldsToRevalidateAfterDisable(phaseName);
        setTimeout(() => {
          const fields = form.getFields();
          const existing = fieldsToRevalidate.filter((path) => fields[path] !== undefined);
          if (existing.length === 0) return;
          void form.validateFields(existing, true);
        }, 0);

        const remaining = enabledPhases.filter((p) => p !== phaseName);
        setSelectedPhase(remaining[0]);
      }}
    >
      {i18n.translate('xpack.streams.editIlmPhasesFlyout.removePhase', {
        defaultMessage: 'Remove {phase} phase',
        values: { phase: phaseName },
      })}
    </EuiButton>
  );
};
