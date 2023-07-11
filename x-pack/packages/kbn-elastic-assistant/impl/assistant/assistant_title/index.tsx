/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiModalHeaderTitle,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from '../translations';

export const AssistantTitle: FunctionComponent<{
  currentTitle: { title: string | JSX.Element; titleIcon: string };
  docLinks: Omit<DocLinksStart, 'links'>;
}> = ({ currentTitle, docLinks }) => {
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const url = `${ELASTIC_WEBSITE_URL}guide/en/security/${DOC_LINK_VERSION}/security-assistant.html`;

  const documentationLink = useMemo(
    () => (
      <EuiLink
        aria-label={i18n.TOOLTIP_ARIA_LABEL}
        data-test-subj="externalDocumentationLink"
        href={url}
        rel="noopener"
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
        defaultMessage="The Elastic AI Assistant is currently in beta. For more information on the assistant feature and its usage, please reference the {documentationLink}."
        id="xpack.elasticAssistant.assistant.technicalPreview.tooltipContent"
        values={{
          documentationLink,
        }}
      />
    ),
    [documentationLink]
  );
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = () => setIsPopoverOpen((isOpen: boolean) => !isOpen);
  const closePopover = () => setIsPopoverOpen(false);
  return (
    <EuiModalHeaderTitle>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type={currentTitle.titleIcon} size="xl" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{currentTitle.title}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiButtonIcon
                aria-label={i18n.TOOLTIP_ARIA_LABEL}
                iconSize="l"
                iconType="iInCircle"
                onClick={onButtonClick}
              />
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            anchorPosition="upCenter"
          >
            <EuiText grow={false} css={{ maxWidth: '400px' }}>
              <h4>{i18n.TOOLTIP_TITLE}</h4>
              <p>{content}</p>
            </EuiText>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiModalHeaderTitle>
  );
};
