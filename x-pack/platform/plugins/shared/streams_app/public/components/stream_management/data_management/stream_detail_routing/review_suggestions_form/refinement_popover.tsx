/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  EuiPopover,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
  useEuiFontSize,
  useGeneratedHtmlId,
  keys,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AiButtonIcon, type AiButtonIconType } from '@kbn/shared-ux-ai-components';
import type { AIFeatures } from '../../../../../hooks/use_ai_features';
import { ConnectorIcon } from '../../../../connector_list_button/connector_icon';
import { ConnectorPickerPopover } from '../../../../connector_list_button/connector_picker_popover';
import { GenerateSuggestionButton } from './generate_suggestions_button';

export interface RefinementPopoverProps {
  onRefine: (connectorId: string, userPrompt?: string) => void;
  aiFeatures: AIFeatures;
  isLoading?: boolean;
  isDisabled?: boolean;
}

export const RefinementPopover = ({
  onRefine,
  aiFeatures,
  isLoading = false,
  isDisabled = false,
}: RefinementPopoverProps) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isConnectorPopoverOpen, setIsConnectorPopoverOpen] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const editorId = useGeneratedHtmlId({ prefix: 'refinementEditor' });

  const openPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
    setUserPrompt('');
    if (editorRef.current) {
      editorRef.current.textContent = '';
    }
  }, []);

  const handleRefine = useCallback(() => {
    const connectorId = aiFeatures.genAiConnectors.selectedConnector;
    if (connectorId) {
      const trimmedPrompt = userPrompt.trim();
      onRefine(connectorId, trimmedPrompt || undefined);
      closePopover();
    }
  }, [aiFeatures.genAiConnectors.selectedConnector, onRefine, userPrompt, closePopover]);

  const connectorsResult = aiFeatures.genAiConnectors;

  const selectedConnectorName = connectorsResult.connectors?.find(
    (c) => c.connectorId === connectorsResult.selectedConnector
  )?.name;

  const fontSize = useEuiFontSize('s');

  const panelStyles = css`
    width: 486px;
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    overflow: hidden;
  `;

  const containerStyles = css`
    border: 1px solid transparent;
    border-radius: ${euiTheme.border.radius.medium};
    transition: border 250ms;
    &:has([contenteditable]:focus) {
      border: 1px solid;
      border-image-source: linear-gradient(
        130.84deg,
        ${euiTheme.colors.backgroundLightPrimary} 2.98%,
        ${euiTheme.colors.backgroundLightAssistance} 66.24%
      );
      border-image-slice: 1;
    }
  `;

  const editorAreaStyles = css`
    padding: ${euiTheme.size.m};
  `;

  const editorStyles = css`
    flex-grow: 1;
    min-height: 40px;
    max-height: 200px;
    overflow-y: auto;
    &#${CSS.escape(editorId)} {
      outline-style: none;
    }
    ${fontSize}
    &[data-placeholder]:empty:before {
      content: attr(data-placeholder);
      color: ${euiTheme.colors.textDisabled};
      pointer-events: none;
      display: block;
    }
  `;

  const toolbarStyles = css`
    padding: ${euiTheme.size.m};
    border-top: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
  `;

  const triggerButton = (
    <GenerateSuggestionButton
      size="s"
      onClick={openPopover}
      isLoading={isLoading}
      isDisabled={isDisabled}
      aiFeatures={aiFeatures}
      showConnectorSelector={false}
    >
      {modifySuggestionsText}
    </GenerateSuggestionButton>
  );

  return (
    <EuiPopover
      button={triggerButton}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      initialFocus={() => editorRef.current as HTMLElement}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      panelProps={{ css: panelStyles }}
      aria-label={popoverAriaLabel}
      data-test-subj="streamsAppRefinementPopover"
    >
      <div css={containerStyles}>
        {/* Editor area */}
        <div
          css={editorAreaStyles}
          aria-label={containerAriaLabel}
          data-test-subj="streamsAppRefinementInputContainer"
        >
          <div
            ref={editorRef}
            id={editorId}
            contentEditable="plaintext-only"
            role="textbox"
            aria-multiline="true"
            aria-label={guidanceAriaLabel}
            tabIndex={0}
            data-placeholder={placeholderText}
            data-test-subj="streamsAppRefinementGuidanceEditor"
            css={editorStyles}
            onInput={() => {
              setUserPrompt(editorRef.current?.textContent ?? '');
            }}
            onKeyDown={(e) => {
              if (e.key === keys.ESCAPE) {
                e.stopPropagation();
                closePopover();
              } else if (!e.shiftKey && e.key === keys.ENTER) {
                e.preventDefault();
                handleRefine();
              }
            }}
          />
        </div>

        {/* Toolbar */}
        <EuiFlexGroup
          css={toolbarStyles}
          gutterSize="s"
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
        >
          {/* Left: connector picker + name */}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              {connectorsResult?.connectors && connectorsResult.connectors.length >= 2 && (
                <EuiFlexItem grow={false}>
                  <ConnectorPickerPopover
                    connectors={connectorsResult}
                    isOpen={isConnectorPopoverOpen}
                    onClose={() => setIsConnectorPopoverOpen(false)}
                    aria-label={connectorPickerAriaLabel}
                    button={
                      <EuiButtonIcon
                        data-test-subj="streamsAppRefinementPickConnectorButton"
                        onClick={() => setIsConnectorPopoverOpen((prev) => !prev)}
                        color="text"
                        size="s"
                        iconType="controlsHorizontal"
                        aria-label={connectorPickerAriaLabel}
                      />
                    }
                  />
                </EuiFlexItem>
              )}
              {selectedConnectorName && (
                <>
                  <EuiFlexItem grow={false}>
                    <ConnectorIcon connectorName={selectedConnectorName} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="s"
                      css={css`
                        font-weight: ${euiTheme.font.weight.medium};
                      `}
                      data-test-subj="streamsAppRefinementConnectorLabel"
                    >
                      {selectedConnectorName}
                    </EuiText>
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          {/* Right: cancel + submit */}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty size="s" flush="both" color="text" onClick={closePopover}>
                  {cancelText}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AiButtonIcon
                  iconType={'sortUp' as AiButtonIconType}
                  variant="accent"
                  size="s"
                  onClick={handleRefine}
                  isDisabled={!aiFeatures.genAiConnectors.selectedConnector}
                  aria-label={submitAriaLabel}
                  data-test-subj="streamsAppRefinementSubmitButton"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};

const modifySuggestionsText = i18n.translate('xpack.streams.refinementPopover.modifySuggestions', {
  defaultMessage: 'Modify suggestions',
});

const placeholderText = i18n.translate('xpack.streams.refinementPopover.placeholder', {
  defaultMessage: 'e.g., Partition by service name and severity level',
});

const cancelText = i18n.translate('xpack.streams.refinementPopover.cancel', {
  defaultMessage: 'Cancel',
});

const guidanceAriaLabel = i18n.translate('xpack.streams.refinementPopover.guidanceAriaLabel', {
  defaultMessage: 'Guidance for AI partition refinement',
});

const popoverAriaLabel = i18n.translate('xpack.streams.refinementPopover.popoverAriaLabel', {
  defaultMessage: 'Refine partition suggestions',
});

const containerAriaLabel = i18n.translate('xpack.streams.refinementPopover.containerAriaLabel', {
  defaultMessage: 'Refinement input form',
});

const submitAriaLabel = i18n.translate('xpack.streams.refinementPopover.submitAriaLabel', {
  defaultMessage: 'Submit refinement',
});

const connectorPickerAriaLabel = i18n.translate(
  'xpack.streams.refinementPopover.connectorPickerAriaLabel',
  {
    defaultMessage: 'Choose AI connector',
  }
);
