/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { buildRequestPreviewCodeContent } from '../shared/utils';

export function useRequestPreviewFlyoutState() {
  const [isRequestPreviewFlyoutOpen, setIsRequestPreviewFlyoutOpen] = React.useState(false);
  const [requestPreviewFlyoutCodeContent, setRequestPreviewFlyoutCodeContent] =
    React.useState<string>('');

  const openRequestPreviewFlyout = useCallback(
    ({ method, url, body }: { method: string; url: string; body: unknown }) => {
      setRequestPreviewFlyoutCodeContent(
        buildRequestPreviewCodeContent({
          method,
          url,
          body,
        })
      );
      setIsRequestPreviewFlyoutOpen(true);
    },
    []
  );

  const closeRequestPreviewFlyout = useCallback(() => {
    setIsRequestPreviewFlyoutOpen(false);
    setRequestPreviewFlyoutCodeContent('');
  }, []);

  return {
    isRequestPreviewFlyoutOpen,
    requestPreviewFlyoutCodeContent,
    openRequestPreviewFlyout,
    closeRequestPreviewFlyout,
  };
}
