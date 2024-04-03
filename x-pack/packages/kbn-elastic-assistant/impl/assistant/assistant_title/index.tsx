/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiModalHeaderTitle,
  EuiPopover,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from '../translations';
import type { Conversation } from '../../..';
import { ConnectorSelectorInline } from '../../connectorland/connector_selector_inline/connector_selector_inline';
import { AssistantAvatar } from '../assistant_avatar/assistant_avatar';

/**
 * Renders a header title, a tooltip button, and a popover with
 * information about the assistant feature and access to documentation.
 */
export const AssistantTitle: React.FC<{
  isDisabled?: boolean;
  title: string | JSX.Element;
  docLinks: Omit<DocLinksStart, 'links'>;
  selectedConversation: Conversation | undefined;
  onChange: (updatedConversation: Conversation) => void;
}> = ({ isDisabled = false, title, docLinks, selectedConversation, onChange }) => {
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

  return (
    <EuiModalHeaderTitle>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <AssistantAvatar data-test-subj="titleIcon" size={'m'} />
        </EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size={'s'}>
                  <h3>{title}</h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
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
                  <EuiText data-test-subj="tooltipContent" grow={false} css={{ maxWidth: '400px' }}>
                    <EuiText size={'s'}>
                      <p>{content}</p>
                    </EuiText>
                  </EuiText>
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ConnectorSelectorInline
              isDisabled={isDisabled || selectedConversation === undefined}
              selectedConnectorId={selectedConnectorId}
              selectedConversation={selectedConversation}
              onConnectorSelected={onChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiModalHeaderTitle>
  );
};
