/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNotificationsStepValid } from './notifications_validation';

describe('isNotificationsStepValid', () => {
  it('returns true when notifications are disabled', () => {
    expect(isNotificationsStepValid(undefined)).toBe(true);
  });

  it('returns true when notifications.workflows is empty', () => {
    expect(isNotificationsStepValid({ workflows: [] })).toBe(true);
  });

  it('returns false when an existing-workflow action has no workflowId', () => {
    expect(
      isNotificationsStepValid({
        workflows: [{ id: 'item-1', source: 'existing', workflowId: null }],
      })
    ).toBe(false);
  });

  it('returns true for a complete existing-workflow action', () => {
    expect(
      isNotificationsStepValid({
        workflows: [{ id: 'item-1', source: 'existing', workflowId: 'wf-1' }],
      })
    ).toBe(true);
  });

  it('returns false for an inline action with no connector', () => {
    expect(
      isNotificationsStepValid({
        workflows: [
          {
            id: 'item-1',
            source: 'inline',
            stepType: 'email',
            connectorId: null,
            params: '',
          },
        ],
      })
    ).toBe(false);
  });
});
