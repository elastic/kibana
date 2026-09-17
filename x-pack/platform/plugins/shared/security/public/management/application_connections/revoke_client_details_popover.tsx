/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiPopover } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import useToggle from 'react-use/lib/useToggle';

import { McpClientDetailsContent } from '@kbn/agent-builder-browser';

import { labels } from './constants/i18n';
import type { OAuthClient } from './service/application_connections_api_client';

const popoverContentStyles = css`
  inline-size: 460px;
`;

export interface RevokeClientDetailsPopoverProps {
  client: OAuthClient;
}

export const RevokeClientDetailsPopover = ({ client }: RevokeClientDetailsPopoverProps) => {
  const [isOpen, toggleOpen] = useToggle(false);
  const displayName = client.client_name ?? client.id;

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => toggleOpen(false)}
      anchorPosition="rightCenter"
      panelPaddingSize="m"
      aria-label={labels.viewClientDetails.linkAriaLabel(displayName)}
      button={
        <EuiLink
          onClick={() => toggleOpen()}
          aria-label={labels.viewClientDetails.linkAriaLabel(displayName)}
          data-test-subj={`revokeClientDetailsPopoverButton-${client.id}`}
        >
          {displayName}
        </EuiLink>
      }
    >
      <div css={popoverContentStyles} data-test-subj={`revokeClientDetailsPopover-${client.id}`}>
        <McpClientDetailsContent clientDetails={client} presentation="popover" />
      </div>
    </EuiPopover>
  );
};
