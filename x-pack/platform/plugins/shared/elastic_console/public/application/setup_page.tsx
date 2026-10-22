/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBetaBadge,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiCopy,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

interface SetupResponse {
  elasticsearchUrl: string;
  kibanaUrl: string;
  apiKeyEncoded: string;
}

function blob(data: SetupResponse) {
  return JSON.stringify(
    {
      kibanaUrl: data.kibanaUrl,
      elasticsearchUrl: data.elasticsearchUrl,
      apiKey: data.apiKeyEncoded,
    },
    null,
    2
  );
}

export const SetupPage: React.FC = () => {
  const { services } = useKibana<CoreStart>();
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await services.http.post<SetupResponse>('/internal/elastic_ramen/setup');
      setSetupData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create setup credentials');
    } finally {
      setIsLoading(false);
    }
  }, [services.http]);

  const json = setupData ? blob(setupData) : '';

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        pageTitle={<>{'🍜 Elastic Ramen Setup'}</>}
        rightSideItems={[<EuiBetaBadge label="Experimental" color="hollow" />]}
      />
      <EuiPageTemplate.Section>
        <EuiCallOut
          title="Experimental feature — proceed with caution"
          color="warning"
          iconType="flask"
        >
          <p>
            Elastic Ramen is an <strong>experimental</strong> feature under active development. It
            may change, break, or be removed without notice. Use at your own risk — it can expose AI
            connectors to external tools and may produce unexpected behavior. Do not rely on it for
            production workloads.
          </p>
        </EuiCallOut>

        <EuiSpacer />

        <EuiText>
          <p>
            Create connection credentials for Elastic Ramen. Paste the JSON into the RAMEN setup
            dialog to connect.
          </p>
        </EuiText>

        <EuiSpacer />

        {!setupData && (
          <EuiButton fill onClick={handleSetup} isLoading={isLoading}>
            Create credentials
          </EuiButton>
        )}

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
            <EuiCallOut
              announceOnMount
              title="Credentials created"
              color="success"
              iconType="check"
            >
              <p>
                Copy the JSON below and paste it into the Elastic Ramen setup dialog. The API key
                expires in 30 days.
              </p>
            </EuiCallOut>

            <EuiSpacer />

            <EuiCodeBlock language="json" paddingSize="m" isCopyable>
              {json}
            </EuiCodeBlock>

            <EuiSpacer />

            <EuiCopy textToCopy={json}>
              {(copy) => (
                <EuiButton fill onClick={copy} iconType="copy">
                  Copy JSON
                </EuiButton>
              )}
            </EuiCopy>
          </>
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
