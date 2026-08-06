/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PhaseName } from '@kbn/streams-schema';
import { EuiButton } from '@elastic/eui';
import { useFormContext, type FieldPath } from 'react-hook-form';
import type { IlmPhasesFlyoutFormInternal } from '../form';

export interface RemovePhaseButtonProps {
  phaseName: PhaseName | undefined;
  enabledPhases: PhaseName[];
  dataTestSubj: string;
  setSelectedPhase: (phase: PhaseName | undefined) => void;
}

export const RemovePhaseButton = ({
  phaseName,
  enabledPhases,
  dataTestSubj,
  setSelectedPhase,
}: RemovePhaseButtonProps) => {
  const { setValue, trigger } = useFormContext<IlmPhasesFlyoutFormInternal>();
  if (!phaseName) return null;
  if (phaseName === 'hot') return null;

  const enabledPath = `_meta.${phaseName}.enabled` satisfies FieldPath<IlmPhasesFlyoutFormInternal>;

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
        setValue(enabledPath, false);

        // Delay to the next tick so dependent validations see the updated enabled state.
        setTimeout(() => {
          void trigger();
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
