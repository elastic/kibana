/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { EuiButton, EuiCallOut, EuiSpacer, EuiFormRow, EuiText } from '@elastic/eui';
import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type {
  ActionConnectorFieldsProps,
  ConfigFieldSchema,
  SecretsFieldSchema,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SimpleConnectorForm, useKibana } from '@kbn/triggers-actions-ui-plugin/public';

const configFormSchema: ConfigFieldSchema[] = [
  { id: 'sourceId', label: 'Data Source ID', isRequired: false },
];

const secretsFormSchema: SecretsFieldSchema[] = [
  { id: 'token', label: 'Token', isPasswordField: true },
];

const NotionActionConnectorFields: React.FC<ActionConnectorFieldsProps> = ({
                                                                             readOnly,
                                                                             isEdit,
                                                                           }) => {
  const { http } = useKibana().services;
  const { setFieldValue } = useFormContext();
  const [isConnecting, setIsConnecting] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [requestId, setRequestId] = useState<string>('');

  const startOAuthFlow = useCallback(async () => {
    setIsConnecting(true);
    setOauthStatus('pending');
    setErrorMessage('');

    try {
      const response = await http!.post<{ auth_url: string; request_id: string }>(
        '/internal/stack_connectors/notion/oauth/start'
      );

      const { auth_url: authUrl, request_id: newRequestId } = response;
      console.log('Full OAuth response:', JSON.stringify(response, null, 2));
      setRequestId(newRequestId);

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(
        authUrl,
        'Notion OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Fetch secrets from Kibana proxy endpoint
      try {
        const maxRetries = 5;
        const retryDelay = 2000;
        let token = '';

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const secretsData = await http!.get<{ access_token: string }>(
            '/internal/stack_connectors/notion/oauth/secrets',
            {
              query: { request_id: newRequestId },
            }
          );

          token = secretsData.access_token;

          if (token) {
            break;
          }

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }

        // Save the OAuth token to connector secrets using form context
        setFieldValue('secrets.token', token);

        setAccessToken(token);
        setOauthStatus('success');
        setIsConnecting(false);
      } catch (error) {
        setOauthStatus('error');
        setErrorMessage('OAuth flow was cancelled or failed');
        setIsConnecting(false);
      }
    } catch (error) {
      setOauthStatus('error');
      setErrorMessage((error as Error).message || 'Failed to initiate OAuth');
      setIsConnecting(false);
    }
  }, [http, setFieldValue]);

  return (
    <>
      <EuiFormRow
        fullWidth
        label="Authentication Method"
        helpText="Connect to Notion using OAuth for secure authentication"
      >
        <>
          {oauthStatus === 'idle' && (
            <EuiButton
              onClick={startOAuthFlow}
              isLoading={isConnecting}
              disabled={readOnly}
              iconType="logoNotion"
              fill
            >
              Connect with Notion
            </EuiButton>
          )}

          {oauthStatus === 'pending' && (
            <EuiCallOut
              announceOnMount
              title="Waiting for authorization"
              color="primary"
              iconType="iInCircle"
            >
              <p>Please complete the authorization in the popup window.</p>
            </EuiCallOut>
          )}

          {oauthStatus === 'success' && (
            <EuiCallOut
              announceOnMount
              title="Successfully connected!"
              color="success"
              iconType="check"
            >
              <EuiText size="s">
                <p>Your Notion workspace has been connected.</p>
                <p>
                  Request ID: <strong>{requestId}</strong>
                </p>
                <p style={{ wordBreak: 'break-all' }}>
                  Access Token: <strong>{accessToken.substring(0, 8)}...</strong>
                </p>
              </EuiText>
            </EuiCallOut>
          )}

          {oauthStatus === 'error' && (
            <>
              <EuiCallOut
                announceOnMount
                title="Connection failed"
                color="danger"
                iconType="warning"
              >
                <p>{errorMessage}</p>
              </EuiCallOut>
              <EuiSpacer size="s" />
              <EuiButton onClick={startOAuthFlow} disabled={readOnly} iconType="refresh">
                Try Again
              </EuiButton>
            </>
          )}
        </>
      </EuiFormRow>

      {/* Always render form fields so setFieldValue works for OAuth */}
      <div style={{ display: oauthStatus === 'success' ? 'none' : 'block' }}>
        {!isEdit && (
          <>
            <EuiSpacer />
            <EuiCallOut
              announceOnMount
              title="Manual token configuration"
              color="warning"
              iconType="questionInCircle"
            >
              <p>Or manually enter your Notion integration token below:</p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={configFormSchema}
          secretsFormSchema={secretsFormSchema}
        />
      </div>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { NotionActionConnectorFields as default };
