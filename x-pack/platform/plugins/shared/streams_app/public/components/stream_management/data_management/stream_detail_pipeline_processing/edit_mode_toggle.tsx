/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup } from '@elastic/eui';
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

const interactiveLabel = i18n.translate('xpack.streams.enrichment.editMode.interactiveAriaLabel', {
  defaultMessage: 'Interactive visual editor',
});

const jsonLabel = i18n.translate('xpack.streams.enrichment.editMode.jsonAriaLabel', {
  defaultMessage: 'JSON editor',
});

const interactiveTooltip = i18n.translate(
  'xpack.streams.enrichment.editMode.interactiveDescriptionTooltip',
  {
    defaultMessage: 'Edit processors and conditions with a visual editor',
  }
);

const jsonTooltip = i18n.translate('xpack.streams.enrichment.editMode.jsonDescriptionTooltip', {
  defaultMessage: 'Edit processors and conditions as JSON',
});

const errorsTooltip = i18n.translate('xpack.streams.enrichment.editMode.errorsTooltip', {
  defaultMessage: 'Fix errors before switching modes',
});

const draftTooltip = i18n.translate('xpack.streams.enrichment.editMode.draftTooltip', {
  defaultMessage: 'Finish configuring the draft processor before switching modes',
});

const interactiveUnavailableTooltip = i18n.translate(
  'xpack.streams.enrichment.editMode.jsonInteractiveDisabledTooltip',
  {
    defaultMessage:
      'The current JSON configuration contains features that cannot be represented in the interactive editor.',
  }
);

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

  const isInteractiveDisabled = interactiveModeIsUnavailable || (hasErrors && !isInteractiveMode);
  const isJsonDisabled = (hasErrors || hasStepUnderEdit) && isInteractiveMode;

  const getInteractiveToolTipContent = (): string => {
    if (hasErrors && !isInteractiveMode) {
      return errorsTooltip;
    }
    if (interactiveModeIsUnavailable) {
      return interactiveUnavailableTooltip;
    }
    return interactiveTooltip;
  };

  const getJsonToolTipContent = (): string => {
    if (isJsonDisabled) {
      return hasErrors ? errorsTooltip : draftTooltip;
    }
    return jsonTooltip;
  };

  const toggleButtons: EuiButtonGroupOptionProps[] = [
    {
      id: 'interactive',
      label: interactiveLabel,
      iconType: 'cursorDefault',
      // Suppress the native title when using EuiToolTip via toolTipContent
      title: '',
      toolTipContent: getInteractiveToolTipContent(),
      isDisabled: isInteractiveDisabled,
      'data-test-subj': 'streamsAppEnrichmentEditModeInteractiveButton',
    },
    {
      id: 'json',
      label: jsonLabel,
      iconType: 'code',
      title: '',
      toolTipContent: getJsonToolTipContent(),
      isDisabled: isJsonDisabled,
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

  return (
    <EuiButtonGroup
      legend={i18n.translate('xpack.streams.enrichment.editMode.legend', {
        defaultMessage: 'Edit mode selection',
      })}
      options={toggleButtons}
      idSelected={editMode}
      onChange={handleChange}
      buttonSize="compressed"
      isIconOnly
      isFullWidth={false}
      data-test-subj="streamsAppEnrichmentEditModeToggle"
    />
  );
};
