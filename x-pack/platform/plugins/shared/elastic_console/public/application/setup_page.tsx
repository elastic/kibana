/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
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
  const formRef = useRef<HTMLFormElement>(null);

  const handleSetup = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await services.http.post<SetupResponse>('/internal/elastic_console/setup');
      setSetupData(data);
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

        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleSetup} isLoading={isLoading}>
              Generate credentials
            </EuiButton>
          </EuiFlexItem>
          {setupData && (
            <EuiFlexItem grow={false}>
              <EuiButton onClick={() => formRef.current?.submit()} iconType="popout">
                Connect local agent
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer />

        {error && (
          <>
            <EuiCallOut announceOnMount title="Setup failed" color="danger" iconType="error">
              <p>{error}</p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {setupData && (
          <>
            {/* Hidden form for POST-based navigation — keeps credentials out of browser history */}
            <form
              ref={formRef}
              method="POST"
              action={`${LOCAL_AGENT_URL}/config`}
              target="_blank"
              style={{ display: 'none' }}
            >
              <input type="hidden" name="elasticsearch_url" value={setupData.elasticsearchUrl} />
              <input type="hidden" name="kibana_url" value={setupData.kibanaUrl} />
              <input type="hidden" name="api_key" value={setupData.apiKeyEncoded} />
              <input
                type="hidden"
                name="provider"
                value={JSON.stringify({
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
                      baseURL: `${setupData.kibanaUrl}/internal/elastic_console/v1`,
                      apiKey: 'ignored',
                      headers: {
                        Authorization: `ApiKey ${setupData.apiKeyEncoded}`,
                        'x-elastic-internal-origin': 'kibana',
                        'kbn-xsrf': 'true',
                      },
                    },
                  },
                })}
              />
              <input type="hidden" name="model" value="kibana/default" />
            </form>
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
          </>
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
