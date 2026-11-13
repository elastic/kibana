/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { CONTEXT_ENGINE_PATHS } from '../paths';
import { LegacyKiRedirect } from './legacy_ki_redirect';

const renderAt = (path: string) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  render(
    <Router history={history}>
      <Routes>
        <Route
          path={[CONTEXT_ENGINE_PATHS.legacyViewKi, CONTEXT_ENGINE_PATHS.legacyViewKiDocument]}
          exact
          component={LegacyKiRedirect}
        />
        <Route path={CONTEXT_ENGINE_PATHS.detailKnowledgeIndicators} exact>
          <div />
        </Route>
      </Routes>
    </Router>
  );
  return history;
};

describe('LegacyKiRedirect', () => {
  it('redirects the old document page to the tab with the doc selected', () => {
    const history = renderAt('/ai_index/my-index/ki/ki-1?index=backing-1');
    expect(history.location.pathname).toBe('/ai_index/my-index/knowledge_indicators');
    expect(new URLSearchParams(history.location.search).get('doc')).toBe('ki-1');
    expect(new URLSearchParams(history.location.search).get('index')).toBe('backing-1');
  });

  it('redirects the old /document link to the same place', () => {
    const history = renderAt('/ai_index/my-index/ki/ki-1/document?index=backing-1');
    expect(history.location.pathname).toBe('/ai_index/my-index/knowledge_indicators');
    expect(new URLSearchParams(history.location.search).get('doc')).toBe('ki-1');
  });

  it('decodes ids with an encoded slash', () => {
    const history = renderAt('/ai_index/my-index/ki/a%2Fb?index=backing-1');
    expect(new URLSearchParams(history.location.search).get('doc')).toBe('a/b');
  });

  it('works without the index param', () => {
    const history = renderAt('/ai_index/my-index/ki/ki-1');
    expect(history.location.search).toBe('?doc=ki-1');
  });
});
