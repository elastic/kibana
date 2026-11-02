/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useConversationContext } from '../../../../context/conversation/conversation_context';
import { ExternalLinkModal } from './external_link_modal';

interface UseMarkdownLinkClick {
  handleLinkClick: (href: string, e: React.MouseEvent<HTMLAnchorElement>) => void;
  externalLinkModal: React.ReactNode;
}

/** Handles clicks on links rendered in conversation markdown. */
export const useMarkdownLinkClick = (): UseMarkdownLinkClick => {
  const { isEmbeddedContext: isSidebar } = useConversationContext();
  const {
    services: { http, application },
  } = useKibana();

  const [pendingExternalUrl, setPendingExternalUrl] = useState<string | null>(null);

  const handleLinkClick = useCallback(
    (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
      const internal = http?.externalUrl?.isInternalUrl(href);
      if (!internal) {
        // External links always show the confirmation modal
        e.preventDefault();
        setPendingExternalUrl(href);
      } else if (isSidebar) {
        // Internal link in flyout: navigate in current window
        e.preventDefault();
        application.navigateToUrl(new URL(href, window.location.href).toString());
      }
      // Internal link in full page: target="_blank" handles navigation
    },
    [isSidebar, http?.externalUrl, application]
  );

  const externalLinkModal = (
    <ExternalLinkModal url={pendingExternalUrl} onClose={() => setPendingExternalUrl(null)} />
  );

  return { handleLinkClick, externalLinkModal };
};
