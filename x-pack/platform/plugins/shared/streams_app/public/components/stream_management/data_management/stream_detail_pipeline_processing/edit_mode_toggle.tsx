/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useStreamEnrichmentSelector,
  useStreamEnrichmentEvents,
  useOptionalInteractiveModeSelector,
} from './state_management/stream_enrichment_state_machine';
import {
  selectIsInteractiveMode,
  selectHasAnyErrors,
} from './state_management/stream_enrichment_state_machine/selectors';
import { stepUnderEditSelector } from './state_management/interactive_mode_machine/selectors';

export const EditModeToggle = () => {
  const isInteractiveMode = useStreamEnrichmentSelector(selectIsInteractiveMode);
  const isJsonMode = useStreamEnrichmentSelector((state) => Boolean(state.context.jsonModeRef));
  const hasErrors = useStreamEnrichmentSelector((state) => selectHasAnyErrors(state.context));
  const hasStepUnderEdit = useOptionalInteractiveModeSelector(
    (state) => Boolean(stepUnderEditSelector(state.context)),
    false
  );

  const canSwitchToInteractiveMode = useStreamEnrichmentSelector((state) => {
    return state.can({ type: 'mode.switchToInteractive' });
  });

  const interactiveModeIsUnavailable = !canSwitchToInteractiveMode && !isInteractiveMode;

  const { switchToInteractiveMode, switchToJsonMode } = useStreamEnrichmentEvents();

  const editMode = isJsonMode ? 'json' : 'interactive';

  const toggleButtons = [
    {
      id: 'interactive',
      label: i18n.translate('xpack.streams.enrichment.editMode.interactive', {
        defaultMessage: 'Interactive',
      }),
      isDisabled: interactiveModeIsUnavailable || (hasErrors && !isInteractiveMode),
      'data-test-subj': 'streamsAppEnrichmentEditModeInteractiveButton',
    },
    {
      id: 'json',
      label: i18n.translate('xpack.streams.enrichment.editMode.json', {
        defaultMessage: 'JSON',
      }),
      isDisabled: (hasErrors || hasStepUnderEdit) && isInteractiveMode,
      'data-test-subj': 'streamsAppEnrichmentEditModeJsonButton',
    },
  ];

  const handleChange = (optionId: string) => {
    if (optionId === 'interactive') {
      switchToInteractiveMode();
    } else if (optionId === 'json' && !hasStepUnderEdit) {
      switchToJsonMode();
    }
  };

  // Determine tooltip content based on state
  const getTooltipContent = () => {
    if (hasErrors) {
      return i18n.translate('xpack.streams.enrichment.editMode.errorsTooltip', {
        defaultMessage: 'Fix errors before switching modes',
      });
    }
    if (hasStepUnderEdit) {
      return i18n.translate('xpack.streams.enrichment.editMode.draftTooltip', {
        defaultMessage: 'Finish configuring the draft processor before switching modes',
      });
    }
    if (interactiveModeIsUnavailable) {
      return i18n.translate('xpack.streams.enrichment.editMode.jsonInteractiveDisabledTooltip', {
        defaultMessage:
          'The current JSON configuration contains features that cannot be represented in the interactive editor.',
      });
    }
    return undefined;
  };

  return (
    <EuiToolTip content={getTooltipContent()}>
      <EuiButtonGroup
        legend={i18n.translate('xpack.streams.enrichment.editMode.legend', {
          defaultMessage: 'Edit mode selection',
        })}
        options={toggleButtons}
        idSelected={editMode}
        onChange={handleChange}
        buttonSize="compressed"
        isFullWidth={false}
        data-test-subj="streamsAppEnrichmentEditModeToggle"
      />
    </EuiToolTip>
  );
};
