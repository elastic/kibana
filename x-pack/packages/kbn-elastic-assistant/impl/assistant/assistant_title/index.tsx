/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditTitle,
  EuiLink,
  EuiModalHeaderTitle,
  EuiPopover,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import * as i18n from '../translations';
import type { Conversation } from '../../..';
import { ConnectorSelectorInline } from '../../connectorland/connector_selector_inline/connector_selector_inline';
import { AssistantAvatar } from '../assistant_avatar/assistant_avatar';
import { useConversation } from '../use_conversation';

/**
 * Renders a header title, a tooltip button, and a popover with
 * information about the assistant feature and access to documentation.
 */
export const AssistantTitle: React.FC<{
  isDisabled?: boolean;
  title: string;
  docLinks: Omit<DocLinksStart, 'links'>;
  selectedConversation: Conversation | undefined;
  isFlyoutMode: boolean;
  onChange: (updatedConversation: Conversation) => void;
  refetchConversationsState: () => Promise<void>;
}> = ({
  isDisabled = false,
  title,
  docLinks,
  selectedConversation,
  isFlyoutMode,
  onChange,
  refetchConversationsState,
}) => {
  const [newTitle, setNewTitle] = useState(title);
  const [newTitleError, setNewTitleError] = useState(false);
  const { updateConversationTitle } = useConversation();

  const selectedConnectorId = selectedConversation?.apiConfig?.connectorId;

  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const url = `${ELASTIC_WEBSITE_URL}guide/en/security/${DOC_LINK_VERSION}/security-assistant.html`;

  const documentationLink = useMemo(
    () => (
      <EuiLink
        aria-label={i18n.TOOLTIP_ARIA_LABEL}
        data-test-subj="externalDocumentationLink"
        external
        href={url}
        target="_blank"
      >
        {i18n.DOCUMENTATION}
      </EuiLink>
    ),
    [url]
  );

  const content = useMemo(
    () => (
      <FormattedMessage
        defaultMessage="Responses from AI systems may not always be entirely accurate. For more information on the assistant feature and its usage, please reference the {documentationLink}."
        id="xpack.elasticAssistant.assistant.technicalPreview.tooltipContent"
        values={{
          documentationLink,
        }}
      />
    ),
    [documentationLink]
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = useCallback(() => setIsPopoverOpen((isOpen: boolean) => !isOpen), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const handleUpdateTitle = useCallback(
    async (updatedTitle: string) => {
      setNewTitleError(false);

      if (selectedConversation) {
        await updateConversationTitle({
          conversationId: selectedConversation.id,
          updatedTitle,
        });
        await refetchConversationsState();
      }
    },
    [refetchConversationsState, selectedConversation, updateConversationTitle]
  );

  useEffect(() => {
    // Reset the title when the prop changes
    setNewTitle(title);
  }, [title]);

  if (isFlyoutMode) {
    return (
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <AssistantAvatar data-test-subj="titleIcon" size={isFlyoutMode ? 's' : 'm'} />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            overflow: hidden;
          `}
        >
          <EuiInlineEditTitle
            heading="h2"
            inputAriaLabel="Edit text inline"
            value={newTitle}
            size="xs"
            isInvalid={!!newTitleError}
            isReadOnly={selectedConversation?.isDefault}
            onChange={(e) => setNewTitle(e.currentTarget.nodeValue || '')}
            onCancel={() => setNewTitle(title)}
            onSave={handleUpdateTitle}
            editModeProps={{
              formRowProps: {
                fullWidth: true,
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiModalHeaderTitle>
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <AssistantAvatar data-test-subj="titleIcon" size={isFlyoutMode ? 's' : 'm'} />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            overflow: hidden;
          `}
        >
          <EuiFlexGroup
            direction={isFlyoutMode ? 'row' : 'column'}
            gutterSize="none"
            justifyContent={isFlyoutMode ? 'spaceBetween' : 'center'}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle size={'s'}>
                    <h3>{title}</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    css={
                      isFlyoutMode &&
                      css`
                        display: inline-flex;
                      `
                    }
                    button={
                      <EuiButtonIcon
                        aria-label={i18n.TOOLTIP_ARIA_LABEL}
                        data-test-subj="tooltipIcon"
                        iconType="iInCircle"
                        onClick={onButtonClick}
                      />
                    }
                    isOpen={isPopoverOpen}
                    closePopover={closePopover}
                    anchorPosition="rightUp"
                  >
                    <EuiText
                      data-test-subj="tooltipContent"
                      grow={false}
                      css={{ maxWidth: '400px' }}
                    >
                      <EuiText size={'s'}>
                        <p>{content}</p>
                      </EuiText>
                    </EuiText>
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {!isFlyoutMode && (
              <EuiFlexItem grow={false}>
                <ConnectorSelectorInline
                  isDisabled={isDisabled || selectedConversation === undefined}
                  selectedConnectorId={selectedConnectorId}
                  selectedConversation={selectedConversation}
                  isFlyoutMode={isFlyoutMode}
                  onConnectorSelected={onChange}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiModalHeaderTitle>
  );
};
