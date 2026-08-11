/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAiIndexId } from '@kbn/agent-builder-common';
import { getContextStatus } from './context_status';

describe('getContextStatus', () => {
  describe('when the agent has AI indices assigned', () => {
    it('returns "on" whether or not it also inherits any', () => {
      expect(getContextStatus({ assigned: ['sales'], inherited: [] })).toBe('on');
      expect(
        getContextStatus({ assigned: ['sales'], inherited: [agentBuilderDefaultAiIndexId] })
      ).toBe('on');
    });
  });

  describe('when the agent has none assigned', () => {
    it('returns "auto" when it inherits some from its type', () => {
      expect(getContextStatus({ assigned: [], inherited: [agentBuilderDefaultAiIndexId] })).toBe(
        'auto'
      );
      expect(getContextStatus({ assigned: [], inherited: ['another-one'] })).toBe('auto');
    });

    it('returns "off" when it inherits none either', () => {
      expect(getContextStatus({ assigned: [], inherited: [] })).toBe('off');
    });
  });

  // The same id can legally be both assigned and inherited. It still counts as assigned, so the
  // pill reads "on" rather than "auto".
  it('returns "on" when the only index is both assigned and inherited', () => {
    expect(
      getContextStatus({
        assigned: [agentBuilderDefaultAiIndexId],
        inherited: [agentBuilderDefaultAiIndexId],
      })
    ).toBe('on');
  });
});
