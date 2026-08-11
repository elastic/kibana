/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getContextStatus } from './context_status';

describe('getContextStatus', () => {
  describe('when the agent has AI indices of its own', () => {
    it('returns "on" whether or not the type contributes any', () => {
      expect(getContextStatus({ own: ['sales'], base: [] })).toBe('on');
      expect(getContextStatus({ own: ['sales'], base: ['elastic'] })).toBe('on');
    });
  });

  describe('when the agent has none of its own', () => {
    it('returns "auto" when the type contributes some', () => {
      expect(getContextStatus({ own: [], base: ['elastic'] })).toBe('auto');
      expect(getContextStatus({ own: [], base: ['another-one'] })).toBe('auto');
    });

    it('returns "off" when the type contributes none', () => {
      expect(getContextStatus({ own: [], base: [] })).toBe('off');
    });
  });

  // The same id can legally sit in both layers. It still counts as the agent's own, so the pill
  // reads "on" rather than "auto".
  it('returns "on" when the only index is present in both layers', () => {
    expect(getContextStatus({ own: ['elastic'], base: ['elastic'] })).toBe('on');
  });
});
