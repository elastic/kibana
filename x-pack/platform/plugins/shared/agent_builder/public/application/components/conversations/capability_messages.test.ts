/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCapabilityMessagesForSolution } from './capability_messages';

describe('getCapabilityMessagesForSolution', () => {
  it('returns four messages for each Space Solution View', () => {
    expect(getCapabilityMessagesForSolution('classic')).toHaveLength(4);
    expect(getCapabilityMessagesForSolution('oblt')).toHaveLength(4);
    expect(getCapabilityMessagesForSolution('security')).toHaveLength(4);
    expect(getCapabilityMessagesForSolution('es')).toHaveLength(4);
  });

  it('returns different message sets per Solution View', () => {
    expect(getCapabilityMessagesForSolution('classic')[0]).toBe('I can create dashboards');
    expect(getCapabilityMessagesForSolution('oblt')[0]).toBe('I can investigate alerts');
    expect(getCapabilityMessagesForSolution('security')[0]).toBe('I can triage security alerts');
    expect(getCapabilityMessagesForSolution('es')[0]).toBe('I can run ES|QL queries');
  });

  it('falls back to Classic for unknown solutions', () => {
    expect(getCapabilityMessagesForSolution('workplaceai')).toEqual(
      getCapabilityMessagesForSolution('classic')
    );
  });
});
