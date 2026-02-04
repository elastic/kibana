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
  setSelectedIlmPhase: React.Dispatch<React.SetStateAction<PhaseName | undefined>>;
}

export const RemovePhaseButton = ({
  form,
  phaseName,
  enabledPhases,
  dataTestSubj,
  setSelectedIlmPhase,
}: RemovePhaseButtonProps) => {
  if (!phaseName) return null;
  if (phaseName === 'hot') return null;

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
        const remaining = enabledPhases.filter((p) => p !== phaseName);
        setSelectedIlmPhase(remaining[0]);
      }}
    >
      {i18n.translate('xpack.streams.editIlmPhasesFlyout.removePhase', {
        defaultMessage: 'Remove {phase} phase',
        values: { phase: phaseName },
      })}
    </EuiButton>
  );
};
