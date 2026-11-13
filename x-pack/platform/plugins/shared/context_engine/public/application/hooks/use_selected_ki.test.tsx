/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { useSelectedKi } from './use_selected_ki';

const renderSelectedKi = (path: string) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  const { result } = renderHook(() => useSelectedKi(), {
    wrapper: ({ children }) => <Router history={history}>{children}</Router>,
  });
  return { history, result };
};

describe('useSelectedKi', () => {
  it('returns undefined without a doc param', () => {
    const { result } = renderSelectedKi('/ai_index/a/knowledge_documents');
    expect(result.current.selectedKi).toBeUndefined();
  });

  it('reads doc and index from the query', () => {
    const { result } = renderSelectedKi('/ai_index/a/knowledge_documents?doc=a%2Fb&index=idx');
    expect(result.current.selectedKi).toEqual({ kiId: 'a/b', index: 'idx' });
  });

  it('pushes a new history entry and keeps the path', () => {
    const { history, result } = renderSelectedKi('/ai_index/a/knowledge_documents?doc=x&index=i');
    act(() => result.current.selectKi({ id: 'ki-2', index: 'idx-2' }));
    expect(history.length).toBe(2);
    expect(history.location.pathname).toBe('/ai_index/a/knowledge_documents');
    expect(result.current.selectedKi).toEqual({ kiId: 'ki-2', index: 'idx-2' });
  });

  it('replaces the history entry when asked', () => {
    const { history, result } = renderSelectedKi('/ai_index/a/knowledge_documents');
    act(() => result.current.selectKi({ id: 'ki-1', index: 'idx' }, { replace: true }));
    expect(history.length).toBe(1);
    expect(history.action).toBe('REPLACE');
    expect(result.current.selectedKi).toEqual({ kiId: 'ki-1', index: 'idx' });
  });
});
