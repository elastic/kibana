/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiPopover,
  EuiTextArea,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AIFeatures } from '../../../../hooks/use_ai_features';
import { GenerateSuggestionButton } from './generate_suggestions_button';

export interface GenerateSuggestionsPopoverProps {
  onGenerate: (connectorId: string, userPrompt?: string) => void;
  aiFeatures: AIFeatures;
  isLoading?: boolean;
  isDisabled?: boolean;
  buttonLabel?: string;
  buttonIconType?: string;
}

export const GenerateSuggestionsPopover = ({
  onGenerate,
  aiFeatures,
  isLoading = false,
  isDisabled = false,
  buttonLabel,
  buttonIconType,
}: GenerateSuggestionsPopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');

  const openPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const handleGenerate = useCallback(() => {
    const connectorId = aiFeatures.genAiConnectors.selectedConnector;
    if (connectorId) {
      const trimmedPrompt = userPrompt.trim();
      onGenerate(connectorId, trimmedPrompt || undefined);
      setIsPopoverOpen(false);
      setUserPrompt('');
    }
  }, [aiFeatures.genAiConnectors.selectedConnector, onGenerate, userPrompt]);

  const triggerButton = (
    <GenerateSuggestionButton
      size="s"
      onClick={openPopover}
      isLoading={isLoading}
      isDisabled={isDisabled}
      aiFeatures={aiFeatures}
      iconType={buttonIconType}
    >
      {buttonLabel ?? suggestPartitionsText}
    </GenerateSuggestionButton>
  );

  return (
    <EuiPopover
      button={triggerButton}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelPaddingSize="m"
      panelStyle={{ maxWidth: 400 }}
      data-test-subj="streamsAppGenerateSuggestionsPopover"
    >
      <EuiText size="s">
        <p>{popoverDescriptionText}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiTextArea
        placeholder={placeholderText}
        value={userPrompt}
        onChange={(e) => setUserPrompt(e.target.value)}
        rows={3}
        fullWidth
        data-test-subj="streamsAppUserGuidanceTextArea"
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" onClick={closePopover}>
            {cancelText}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            iconType="sparkles"
            onClick={handleGenerate}
            disabled={!aiFeatures.genAiConnectors.selectedConnector}
            data-test-subj="streamsAppPopoverGenerateButton"
          >
            {generateText}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};

const suggestPartitionsText = i18n.translate(
  'xpack.streams.generateSuggestionsPopover.suggestPartitions',
  { defaultMessage: 'Suggest partitions with AI' }
);

const popoverDescriptionText = i18n.translate(
  'xpack.streams.generateSuggestionsPopover.description',
  {
    defaultMessage:
      'Optionally provide instructions to guide the AI when generating partition suggestions.',
  }
);

const placeholderText = i18n.translate('xpack.streams.generateSuggestionsPopover.placeholder', {
  defaultMessage: 'e.g., Partition by service name and severity level',
});

const cancelText = i18n.translate('xpack.streams.generateSuggestionsPopover.cancel', {
  defaultMessage: 'Cancel',
});

const generateText = i18n.translate('xpack.streams.generateSuggestionsPopover.generate', {
  defaultMessage: 'Generate',
});
