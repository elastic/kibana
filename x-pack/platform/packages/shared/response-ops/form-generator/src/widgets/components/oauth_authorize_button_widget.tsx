/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { z } from '@kbn/zod/v4';
import type { BaseWidgetProps } from '../types';

type OAuthAuthorizeButtonWidgetProps = BaseWidgetProps<z.ZodBoolean>;

function getOAuthStatusFromLocation(): 'success' | 'error' | null {
  const params = new URLSearchParams(window.location.search);
  const v = params.get('oauth_authorization');
  if (v === 'success') return 'success';
  if (v === 'error') return 'error';
  return null;
}

function removeOAuthStatusFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('oauth_authorization');
  window.history.replaceState({}, document.title, url.toString());
}

function getReturnUrlForAuthorization(): string {
  // Must be an absolute URL (validated by the server as same-origin)
  const url = new URL(window.location.href);
  // If the user is re-authorizing, don't include the previous status in the return URL
  url.searchParams.delete('oauth_authorization');
  return url.toString();
}

export const OAuthAuthorizeButtonWidget: React.FC<OAuthAuthorizeButtonWidgetProps> = ({
  fieldConfig,
  formConfig,
}) => {
  const [formData] = useFormData();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const oauthStatus = useMemo(() => getOAuthStatusFromLocation(), []);

  useEffect(() => {
    if (oauthStatus) {
      removeOAuthStatusFromUrl();
    }
  }, [oauthStatus]);

  const connectorId: string | undefined = formData?.id;
  const canAuthorize = Boolean(formConfig.isEdit && connectorId && !formConfig.disabled);

  const onAuthorize = useCallback(async () => {
    if (!connectorId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const returnUrl = getReturnUrlForAuthorization();
      const res = await window.fetch(`/internal/actions/connector/${connectorId}/_start_oauth_flow`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'kbn-xsrf': 'true',
        },
        body: JSON.stringify({ returnUrl }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
      }

      const result = (await res.json()) as { authorizationUrl?: unknown };
      const authorizationUrl = result?.authorizationUrl;
      if (typeof authorizationUrl !== 'string' || authorizationUrl.length === 0) {
        throw new Error('Missing authorizationUrl from server response');
      }

      window.location.assign(authorizationUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [connectorId]);

  return (
    <>
      {oauthStatus === 'success' && (
        <>
          <EuiCallOut title="Authorization successful" color="success" iconType="check" />
          <EuiSpacer size="m" />
        </>
      )}
      {oauthStatus === 'error' && (
        <>
          <EuiCallOut title="Authorization failed" color="danger" iconType="warning" />
          <EuiSpacer size="m" />
        </>
      )}
      {errorMessage && (
        <>
          <EuiCallOut title="OAuth authorization failed" color="danger" iconType="warning">
            {errorMessage}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {!formConfig.isEdit && (
        <>
          <EuiCallOut title="Save connector to authorize" color="warning" iconType="iInCircle">
            {fieldConfig?.helpText as string}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiButton isLoading={isLoading} isDisabled={!canAuthorize} onClick={onAuthorize}>
        {String(fieldConfig?.label ?? 'Authorize')}
      </EuiButton>
      <EuiSpacer size="m" />
    </>
  );
};

