/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { TestEndpointResult } from '../../../../../../../common/types';
import { TestEndpointResultView } from './test_endpoint_result';

const renderResult = (result: TestEndpointResult) =>
  render(
    <I18nProvider>
      <TestEndpointResultView result={result} />
    </I18nProvider>
  );

describe('TestEndpointResultView', () => {
  it('shows the text answer', () => {
    renderResult({ type: 'text', content: 'A search engine.' });

    expect(screen.getByTestId('testEndpointResponse')).toHaveTextContent('A search engine.');
  });

  it('shows the vector size and a preview of an embedding', () => {
    renderResult({ type: 'embedding', dimensions: 1024, preview: [0.1, 0.2] });

    expect(screen.getByTestId('testEndpointResponse')).toHaveTextContent('1024 dimensions');
    expect(screen.getByTestId('testEndpointEmbeddingPreview')).toHaveTextContent('[0.1, 0.2, ...]');
  });

  it('does not add an ellipsis when the whole vector is shown', () => {
    renderResult({ type: 'embedding', dimensions: 2, preview: [0.1, 0.2] });

    expect(screen.getByTestId('testEndpointEmbeddingPreview')).toHaveTextContent('[0.1, 0.2]');
  });

  it('shows the heaviest tokens of a sparse embedding', () => {
    renderResult({
      type: 'sparse_embedding',
      tokenCount: 40,
      topTokens: [
        { token: 'search', weight: 1.25 },
        { token: 'engine', weight: 0.5 },
      ],
    });

    expect(screen.getByTestId('testEndpointResponse')).toHaveTextContent('40 weighted tokens');
    expect(screen.getByTestId('testEndpointSparseTokens')).toHaveTextContent('search: 1.250');
    expect(screen.getByTestId('testEndpointSparseTokens')).toHaveTextContent('engine: 0.500');
  });

  it('shows the ranked documents with their scores', () => {
    renderResult({
      type: 'rerank',
      ranking: [
        { index: 2, score: 0.91, text: 'Kibana explores data.' },
        { index: 0, score: 0.12, text: 'Cookies.' },
      ],
    });

    expect(screen.getByTestId('testEndpointRanking')).toHaveTextContent(
      '0.910: Kibana explores data.0.120: Cookies.'
    );
  });
});
