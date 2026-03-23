/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiCopy,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

const LOCAL_AGENT_URL = 'http://localhost:14642';

interface SetupResponse {
  elasticsearchUrl: string;
  kibanaUrl: string;
  apiKeyEncoded: string;
}

export const SetupPage: React.FC = () => {
  const { services } = useKibana<CoreStart>();
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoDeliveryStatus, setAutoDeliveryStatus] = useState<'idle' | 'success' | 'failed'>(
    'idle'
  );

  const handleSetup = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAutoDeliveryStatus('idle');

    try {
      const data = await services.http.post<SetupResponse>('/internal/elastic_console/setup');
      setSetupData(data);

      // Attempt auto-delivery to local agent
      try {
        await fetch(`${LOCAL_AGENT_URL}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            elasticsearch_url: data.elasticsearchUrl,
            kibana_url: data.kibanaUrl,
            api_key: data.apiKeyEncoded,
            provider: {
              kibana: {
                name: 'Kibana LLM Gateway',
                id: 'kibana',
                npm: '@ai-sdk/openai-compatible',
                env: [],
                models: {
                  default: {
                    id: 'default',
                    name: 'Default Connector',
                    attachment: false,
                    reasoning: false,
                    temperature: true,
                    tool_call: true,
                    release_date: '2025-01-01',
                    cost: { input: 0, output: 0 },
                    limit: { context: 128000, output: 8192 },
                  },
                },
                options: {
                  baseURL: `${data.kibanaUrl}/internal/elastic_console/v1`,
                  apiKey: 'ignored',
                  headers: {
                    Authorization: `ApiKey ${data.apiKeyEncoded}`,
                    'x-elastic-internal-origin': 'kibana',
                    'kbn-xsrf': 'true',
                  },
                },
              },
            },
            model: 'kibana/default',
          }),
        });
        setAutoDeliveryStatus('success');
      } catch {
        setAutoDeliveryStatus('failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create setup credentials');
    } finally {
      setIsLoading(false);
    }
  }, [services.http]);

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header pageTitle="Elastic Console Setup" />
      <EuiPageTemplate.Section>
        <EuiText>
          <p>
            Generate connection credentials for external tools to use Kibana-configured AI
            connectors via an OpenAI-compatible API.
          </p>
        </EuiText>

        <EuiSpacer />

        <EuiButton fill onClick={handleSetup} isLoading={isLoading}>
          Generate credentials
        </EuiButton>

        <EuiSpacer />

        {error && (
          <>
            <EuiCallOut announceOnMount title="Setup failed" color="danger" iconType="error">
              <p>{error}</p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {autoDeliveryStatus === 'success' && (
          <>
            <EuiCallOut
              announceOnMount
              title="Credentials delivered to local agent"
              color="success"
              iconType="check"
            >
              <p>
                The credentials were automatically sent to the local Elastic Console agent at{' '}
                {LOCAL_AGENT_URL}.
              </p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {autoDeliveryStatus === 'failed' && setupData && (
          <>
            <EuiCallOut
              announceOnMount
              title="Could not reach local agent"
              color="warning"
              iconType="warning"
            >
              <p>No local agent found at {LOCAL_AGENT_URL}. Copy the credentials below manually.</p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {setupData && (
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiFormRow label="Kibana URL" fullWidth>
                <EuiFieldText value={setupData.kibanaUrl} readOnly fullWidth />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="Elasticsearch URL" fullWidth>
                <EuiFieldText value={setupData.elasticsearchUrl} readOnly fullWidth />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="API Key (Base64)" fullWidth>
                <EuiCodeBlock language="text" paddingSize="s" isCopyable>
                  {setupData.apiKeyEncoded}
                </EuiCodeBlock>
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy
                textToCopy={JSON.stringify(
                  {
                    kibanaUrl: setupData.kibanaUrl,
                    elasticsearchUrl: setupData.elasticsearchUrl,
                    apiKey: setupData.apiKeyEncoded,
                  },
                  null,
                  2
                )}
              >
                {(copy) => (
                  <EuiButton onClick={copy} iconType="copy">
                    Copy all as JSON
                  </EuiButton>
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
