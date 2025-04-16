/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { useInferenceEndpoints } from '../hooks/use_inference_endpoints';
import {
  OptionData,
  getModelOptionsForInferenceEndpoints,
} from '../utils/get_model_options_for_inference_endpoints';

interface SelectModelAndInstallKnowledgeBaseProps {
  onInstall: (inferenceId: string) => Promise<void>;
  isInstalling: boolean;
}

const kbModelSelectionClassName = css`
  width: 400px;
  .euiSelectableListItem__text {
    text-decoration: none !important;
  }
`;

export function SelectModelAndInstallKnowledgeBase({
  onInstall,
  isInstalling,
}: SelectModelAndInstallKnowledgeBaseProps) {
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedInferenceId, setSelectedInferenceId] = useState<string>('');

  const { inferenceEndpoints, isLoading } = useInferenceEndpoints();

  useEffect(() => {
    if (!selectedInferenceId && inferenceEndpoints.length) {
      setSelectedInferenceId(inferenceEndpoints[0].inference_id);
    }
  }, [inferenceEndpoints, selectedInferenceId]);

  const handleInstall = () => {
    if (selectedInferenceId) {
      onInstall(selectedInferenceId);
    }
  };

  const modelOptions = getModelOptionsForInferenceEndpoints({
    endpoints: inferenceEndpoints,
    selectedInferenceId,
  });

  const renderOption = useCallback(
    (option: EuiSelectableOption<OptionData>) => (
      <EuiFlexGroup gutterSize="xs" direction="column" css={{ paddingBlock: euiTheme.size.xs }}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{option.label}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">{option.description}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [euiTheme.size.xs]
  );

  const handleChange = async (newOptions: EuiSelectableOption[]) => {
    const selectedOption = newOptions.find((option) => option.checked === 'on');

    if (selectedOption && selectedOption.key !== selectedInferenceId) {
      setSelectedInferenceId(selectedOption.key as string);
      setIsPopoverOpen(false);
    }
  };

  return (
    <>
      <EuiSpacer size="m" />

      <EuiText color="subdued" size="s">
        {i18n.translate(
          'xpack.aiAssistant.welcomeMessage.knowledgeBase.model.selection.description',
          { defaultMessage: "Choose the default language model for the Assistant's responses." }
        )}
      </EuiText>

      <EuiSpacer size="m" />

      <EuiPopover
        button={
          <EuiButtonEmpty
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            iconType="arrowDown"
            iconSide="right"
          >
            {modelOptions.find((option) => option.key === selectedInferenceId)?.label ||
              'Select a model'}
          </EuiButtonEmpty>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downCenter"
      >
        <EuiSelectable
          aria-label={i18n.translate(
            'xpack.aiAssistant.welcomeMessage.knowledgeBase.model.selection',
            {
              defaultMessage: 'Select Model',
            }
          )}
          options={modelOptions}
          singleSelection="always"
          onChange={handleChange}
          renderOption={renderOption}
          isLoading={isLoading}
          listProps={{
            isVirtualized: false,
            onFocusBadge: false,
            textWrap: 'wrap',
          }}
        >
          {(list) => <div className={kbModelSelectionClassName}>{list}</div>}
        </EuiSelectable>
      </EuiPopover>

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <div>
            <EuiButton
              color="primary"
              fill
              isLoading={isInstalling}
              iconType="importAction"
              data-test-subj="observabilityAiAssistantWelcomeMessageSetUpKnowledgeBaseButton"
              onClick={handleInstall}
              minWidth={false}
            >
              {i18n.translate('xpack.aiAssistant.welcomeMessage.knowledgeBase.installButtonLabel', {
                defaultMessage: 'Install Knowledge base',
              })}
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
