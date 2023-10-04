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
  EuiIcon,
  EuiLink,
  EuiModalHeaderTitle,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from '../translations';

/**
 * Renders a header title with an icon, a tooltip button, and a popover with
 * information about the assistant feature and access to documentation.
 */
export const AssistantTitle: React.FC<{
  title: string | JSX.Element;
  titleIcon: string;
  docLinks: Omit<DocLinksStart, 'links'>;
}> = ({ title, titleIcon, docLinks }) => {
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
  const onButtonClick = useCallback(() => setIsPopoverOpen((isOpen: boolean) => !isOpen), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  return (
    <EuiModalHeaderTitle>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon data-test-subj="titleIcon" type={titleIcon} size="xl" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{title}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiButtonIcon
                aria-label={i18n.TOOLTIP_ARIA_LABEL}
                data-test-subj="tooltipIcon"
                iconSize="l"
                iconType="iInCircle"
                onClick={onButtonClick}
              />
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            anchorPosition="upCenter"
          >
            <EuiText data-test-subj="tooltipContent" grow={false} css={{ maxWidth: '400px' }}>
              <h4>{i18n.TOOLTIP_TITLE}</h4>
              <p>{content}</p>
            </EuiText>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiModalHeaderTitle>
  );
};
