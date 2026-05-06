/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useAsync from 'react-use/lib/useAsync';

import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ApiKeyFlyout } from '@kbn/security-api-key-management';
import type { AuthenticationServiceStart } from '@kbn/security-plugin-types-public';

export interface ManagementLandingApiKeyFlyoutProps {
  onClose: () => void;
  core: CoreStart;
  authc: AuthenticationServiceStart;
}

/**
 * Renders the same API key creation flyout as the API keys management /create route,
 * on top of Stack Management via the landing quick-action overlay slot.
 */
export function ManagementLandingApiKeyFlyout({
  onClose,
  core,
  authc,
}: ManagementLandingApiKeyFlyoutProps) {
  const { value: currentUser, loading: isLoadingCurrentUser } = useAsync(
    () => authc.getCurrentUser(),
    []
  );

  const apiKeysCaps = core.application.capabilities.api_keys as { save?: boolean } | undefined;
  const readOnly = !apiKeysCaps?.save;

  return (
    <KibanaContextProvider services={core}>
      <ApiKeyFlyout
        onSuccess={() => {
          onClose();
        }}
        onCancel={onClose}
        canManageCrossClusterApiKeys={false}
        currentUser={currentUser}
        isLoadingCurrentUser={isLoadingCurrentUser}
        readOnly={readOnly}
      />
    </KibanaContextProvider>
  );
}
