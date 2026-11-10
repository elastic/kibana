/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { SourceSetupInstructions } from './source_setup_instructions';
import type { SourceViewModel } from './types';

const BULK_ENDPOINT = 'https://cluster.ingest.elastic.cloud/inputs/elasticsearch/orders/_bulk';

const managedBulkSource: SourceViewModel = {
  id: 'orders',
  name: 'Orders',
  type: 'async_bulk',
  to: null,
  endpoint: BULK_ENDPOINT,
  endpoints: [
    { id: 'bulk', url: BULK_ENDPOINT },
    {
      id: 'bulkTarget',
      url: 'https://cluster.ingest.elastic.cloud/inputs/elasticsearch/orders/<target>/_bulk',
    },
  ],
  destinations: [],
  apiKeys: [],
  supportedTelemetry: ['docs'],
};

const renderInstructions = (apiKey?: string) =>
  render(
    <I18nProvider>
      <SourceSetupInstructions source={managedBulkSource} apiKey={apiKey} />
    </I18nProvider>
  );

describe('SourceSetupInstructions for a Managed _bulk source', () => {
  it('offers a cURL snippet and no Logstash tab', () => {
    renderInstructions('enc');

    expect(screen.getByTestId('streamsSourceSetupTab-curl')).toHaveTextContent('cURL');
    expect(screen.queryByText('Logstash')).not.toBeInTheDocument();
    const snippet = screen.getByTestId('streamsSourceSetupCodeBlock').textContent;
    expect(snippet).toContain(`curl -X POST "${BULK_ENDPOINT}" \\\n`);
    expect(snippet).toContain('Authorization: ApiKey enc');
  });

  it('stamps the sample document with the time the command runs', () => {
    renderInstructions('enc');

    const snippet = screen.getByTestId('streamsSourceSetupCodeBlock').textContent;
    expect(snippet).toContain('--data-binary @- <<EOF\n');
    expect(snippet).toContain('{"@timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)",');
  });

  it('shows the notes without an API key', () => {
    renderInstructions();

    expect(screen.queryByTestId('streamsSourceSetupCodeBlock')).not.toBeInTheDocument();
    expect(screen.getByTestId('streamsSourceSetupNotes')).toBeInTheDocument();
  });
});
