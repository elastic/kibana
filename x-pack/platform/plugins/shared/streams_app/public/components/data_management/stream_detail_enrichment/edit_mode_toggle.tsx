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
} from './state_management/stream_enrichment_state_machine';
import { selectIsInteractiveMode } from './state_management/stream_enrichment_state_machine/selectors';

export const EditModeToggle = () => {
  const isInteractiveMode = useStreamEnrichmentSelector(selectIsInteractiveMode);

  const canSwitchToInteractiveMode = useStreamEnrichmentSelector((state) => {
    return state.can({ type: 'mode.switchToInteractive' });
  });

  const interactiveModeIsUnavailable = !canSwitchToInteractiveMode && !isInteractiveMode;

  const { switchToInteractiveMode, switchToYamlMode } = useStreamEnrichmentEvents();

  const editMode = isInteractiveMode ? 'interactive' : 'yaml';

  const toggleButtons = [
    {
      id: 'interactive',
      label: i18n.translate('xpack.streams.enrichment.editMode.interactive', {
        defaultMessage: 'Interactive',
      }),
      isDisabled: interactiveModeIsUnavailable,
    },
    {
      id: 'yaml',
      label: i18n.translate('xpack.streams.enrichment.editMode.yaml', {
        defaultMessage: 'YAML',
      }),
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
    <EuiToolTip
      content={
        interactiveModeIsUnavailable
          ? i18n.translate('xpack.streams.enrichment.editMode.interactiveDisabledTooltip', {
              defaultMessage:
                'The current YAML configuration contains features that cannot be represented in the interactive editor',
            })
          : undefined
      }
    >
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
