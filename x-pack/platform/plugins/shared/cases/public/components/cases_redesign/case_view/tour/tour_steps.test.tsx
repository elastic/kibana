/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCaseDetailsTourSteps } from './tour_steps';

const ALL_ENABLED = {
  canCreateComment: true,
  canUpdate: true,
  hasCaseSettings: true,
  isAddToChatAvailable: true,
  isTemplatesEnabled: true,
  isConnectorAuthorized: true,
};

describe('getCaseDetailsTourSteps', () => {
  it('includes every step in order when all conditions are met', () => {
    const ids = getCaseDetailsTourSteps(ALL_ENABLED).map((s) => s.stepId);
    expect(ids).toEqual([
      'attach',
      'chat',
      'pills',
      'settings',
      'attributes',
      'templateFields',
      'connector',
    ]);
  });

  it('always includes the pills and attributes steps', () => {
    const ids = getCaseDetailsTourSteps({
      canCreateComment: false,
      canUpdate: false,
      hasCaseSettings: false,
      isAddToChatAvailable: false,
      isTemplatesEnabled: false,
      isConnectorAuthorized: false,
    }).map((s) => s.stepId);
    expect(ids).toEqual(['pills', 'attributes']);
  });

  it('omits the chat step when add-to-chat is not available', () => {
    const ids = getCaseDetailsTourSteps({ ...ALL_ENABLED, isAddToChatAvailable: false }).map(
      (s) => s.stepId
    );
    expect(ids).not.toContain('chat');
  });

  it('omits the attach step without create-comment permission', () => {
    const ids = getCaseDetailsTourSteps({ ...ALL_ENABLED, canCreateComment: false }).map(
      (s) => s.stepId
    );
    expect(ids).not.toContain('attach');
  });

  it('omits the settings step without update permission', () => {
    const ids = getCaseDetailsTourSteps({ ...ALL_ENABLED, canUpdate: false }).map((s) => s.stepId);
    expect(ids).not.toContain('settings');
  });

  it('omits the settings step when the solution enables no case settings', () => {
    const ids = getCaseDetailsTourSteps({ ...ALL_ENABLED, hasCaseSettings: false }).map(
      (s) => s.stepId
    );
    expect(ids).not.toContain('settings');
  });

  it('omits the template fields step when templates are disabled', () => {
    const ids = getCaseDetailsTourSteps({ ...ALL_ENABLED, isTemplatesEnabled: false }).map(
      (s) => s.stepId
    );
    expect(ids).not.toContain('templateFields');
  });

  it('omits the connector step when push-to-service is not authorized', () => {
    const ids = getCaseDetailsTourSteps({ ...ALL_ENABLED, isConnectorAuthorized: false }).map(
      (s) => s.stepId
    );
    expect(ids).not.toContain('connector');
  });

  it('gives every step a unique anchor and non-empty title', () => {
    const steps = getCaseDetailsTourSteps(ALL_ENABLED);
    const anchors = steps.map((s) => s.anchor);
    expect(new Set(anchors).size).toBe(anchors.length);
    steps.forEach((s) => expect(s.title.length).toBeGreaterThan(0));
  });
});
