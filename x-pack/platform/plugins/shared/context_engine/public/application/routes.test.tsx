/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { ContextEngineRoutes } from './routes';

jest.mock('./pages/ai_index_detail_page', () => ({
  AiIndexDetailPage: () => <div data-test-subj="detailPage" />,
}));

jest.mock('./context_landing_page', () => ({
  ContextLandingPage: () => <div data-test-subj="landingPage" />,
}));

const renderAt = (path: string) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  render(
    <Router history={history}>
      <ContextEngineRoutes />
    </Router>
  );
  return history;
};

describe('ContextEngineRoutes', () => {
  it('opens the Knowledge documents tab', () => {
    const history = renderAt('/ai_index/my-index/knowledge_documents?doc=a&index=b');
    expect(history.location.pathname).toBe('/ai_index/my-index/knowledge_documents');
    expect(screen.getByTestId('detailPage')).toBeInTheDocument();
  });

  it('sends an unknown path under an AI index to that AI index', () => {
    const history = renderAt('/ai_index/my-index/knowledge_indicators?doc=a&index=b');
    expect(history.location.pathname).toBe('/ai_index/my-index');
    expect(screen.getByTestId('detailPage')).toBeInTheDocument();
  });

  it('sends any other unknown path to the landing page', () => {
    const history = renderAt('/something/else');
    expect(history.location.pathname).toBe('/');
    expect(screen.getByTestId('landingPage')).toBeInTheDocument();
  });
});
