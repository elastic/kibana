/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionSourceRt,
  ActionSourceTypes,
  isActionSource,
  isHeaderActionSource,
  toActionSource,
} from './v1';

describe('ActionSource', () => {
  it('decodes a full source', () => {
    const value = {
      type: 'agent',
      id: 'agent-1',
      name: 'Elastic AI Agent',
      run_id: 'conv-1',
    };

    expect(ActionSourceRt.decode(value)).toEqual({ _tag: 'Right', right: value });
  });

  it('decodes a source with only type and id', () => {
    const value = { type: 'rule', id: 'rule-1' };

    expect(ActionSourceRt.decode(value)).toEqual({ _tag: 'Right', right: value });
  });

  it('isActionSource accepts a valid source', () => {
    expect(isActionSource({ type: 'workflow', id: 'wf-1' })).toBe(true);
  });

  it('isActionSource rejects missing id', () => {
    expect(isActionSource({ type: 'agent' })).toBe(false);
  });

  it('isActionSource rejects an unknown type', () => {
    expect(isActionSource({ type: 'admin', id: 'admin-1' })).toBe(false);
  });

  it('isActionSource rejects a non-string name', () => {
    expect(isActionSource({ type: 'agent', id: 'agent-1', name: 123 })).toBe(false);
  });

  it('isActionSource rejects a non-string run_id', () => {
    expect(isActionSource({ type: 'agent', id: 'agent-1', run_id: 123 })).toBe(false);
  });

  it('isActionSource rejects an array', () => {
    expect(isActionSource(['agent', 'agent-1'])).toBe(false);
  });

  it('toActionSource omits empty name and runId', () => {
    expect(toActionSource({ type: 'rule', id: 'rule-1', name: '', runId: null })).toEqual({
      type: 'rule',
      id: 'rule-1',
    });
  });

  it('shows api sources on the header', () => {
    expect(isHeaderActionSource({ type: ActionSourceTypes.api, id: 'api' })).toBe(true);
  });

  it('hides user sources from the header', () => {
    expect(isHeaderActionSource({ type: ActionSourceTypes.user, id: 'user' })).toBe(false);
  });
});
