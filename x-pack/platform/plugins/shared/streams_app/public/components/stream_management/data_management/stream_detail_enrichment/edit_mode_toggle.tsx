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
} from './state_management/stream_enrichment_state_machine';
import {
  selectIsInteractiveMode,
  selectHasAnyErrors,
} from './state_management/stream_enrichment_state_machine/selectors';

const interactiveLabel = i18n.translate('xpack.streams.enrichment.editMode.interactiveAriaLabel', {
  defaultMessage: 'Interactive visual editor',
});

const yamlLabel = i18n.translate('xpack.streams.enrichment.editMode.yamlAriaLabel', {
  defaultMessage: 'YAML editor',
});

const interactiveTooltip = i18n.translate(
  'xpack.streams.enrichment.editMode.interactiveDescriptionTooltip',
  {
    defaultMessage: 'Edit processors and conditions with a visual editor',
  }
);

const yamlTooltip = i18n.translate('xpack.streams.enrichment.editMode.yamlDescriptionTooltip', {
  defaultMessage: 'Edit processors and conditions as YAML',
});

const errorsTooltip = i18n.translate('xpack.streams.enrichment.editMode.errorsTooltip', {
  defaultMessage: 'Fix errors before switching modes',
});

const interactiveUnavailableTooltip = i18n.translate(
  'xpack.streams.enrichment.editMode.interactiveDisabledTooltip',
  {
    defaultMessage:
      'The current YAML configuration contains features that cannot be represented in the interactive editor.',
  }
);

export const EditModeToggle = () => {
  const isInteractiveMode = useStreamEnrichmentSelector(selectIsInteractiveMode);
  const hasErrors = useStreamEnrichmentSelector((state) => selectHasAnyErrors(state.context));

  const canSwitchToInteractiveMode = useStreamEnrichmentSelector((state) => {
    return state.can({ type: 'mode.switchToInteractive' });
  });

  const interactiveModeIsUnavailable = !canSwitchToInteractiveMode && !isInteractiveMode;

  const { switchToInteractiveMode, switchToYamlMode } = useStreamEnrichmentEvents();

  const editMode = isInteractiveMode ? 'interactive' : 'yaml';

  const isInteractiveDisabled = interactiveModeIsUnavailable || (hasErrors && !isInteractiveMode);
  const isYamlDisabled = hasErrors && isInteractiveMode;

  const getInteractiveToolTipContent = (): string => {
    if (hasErrors && !isInteractiveMode) {
      return errorsTooltip;
    }
    if (interactiveModeIsUnavailable) {
      return interactiveUnavailableTooltip;
    }
    return interactiveTooltip;
  };

  const getYamlToolTipContent = (): string => {
    if (isYamlDisabled) {
      return errorsTooltip;
    }
    return yamlTooltip;
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
      id: 'yaml',
      label: yamlLabel,
      iconType: 'code',
      title: '',
      toolTipContent: getYamlToolTipContent(),
      isDisabled: isYamlDisabled,
      'data-test-subj': 'streamsAppEnrichmentEditModeYamlButton',
    },
  ];

  const handleChange = (optionId: string) => {
    if (optionId === 'interactive') {
      switchToInteractiveMode();
    } else if (optionId === 'yaml') {
      switchToYamlMode();
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
