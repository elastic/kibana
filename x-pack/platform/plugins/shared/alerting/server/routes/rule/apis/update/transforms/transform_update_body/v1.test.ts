/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformUpdateBody } from './v1';

describe('transformUpdateBody', () => {
  it('should transform the update body with all fields populated', () => {
    const updateBody = {
      name: 'Test Rule',
      tags: ['tag1', 'tag2'],
      throttle: '1m',
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
      notify_when: 'onActionGroupChange',
      alert_delay: '5m',
      flapping: {
        look_back_window: 10,
        status_change_threshold: 5,
      },
      artifacts: { artifact1: 'value1' },
    };

    const actions = [
      {
        group: 'default',
        id: 'action1',
        params: { key: 'value' },
        frequency: {
          notify_when: 'onThrottleInterval',
          throttle: '1m',
          summary: true,
        },
        alerts_filter: { query: 'test-query' },
        use_alert_data_for_template: true,
      },
    ];

    const systemActions = [
      {
        id: 'systemAction1',
        params: { key: 'value' },
      },
    ];

    const result = transformUpdateBody({ updateBody, actions, systemActions });

    expect(result).toEqual({
      name: 'Test Rule',
      tags: ['tag1', 'tag2'],
      throttle: '1m',
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
      notifyWhen: 'onActionGroupChange',
      alertDelay: '5m',
      flapping: {
        lookBackWindow: 10,
        statusChangeThreshold: 5,
      },
      artifacts: { artifact1: 'value1' },
      actions: [
        {
          group: 'default',
          id: 'action1',
          params: { key: 'value' },
          frequency: {
            throttle: '1m',
            summary: true,
            notifyWhen: 'onThrottleInterval',
          },
          alertsFilter: { query: 'test-query' },
          useAlertDataForTemplate: true,
        },
      ],
      systemActions: [
        {
          id: 'systemAction1',
          params: { key: 'value' },
        },
      ],
    });
  });

  it('should handle missing optional fields', () => {
    const updateBody = {
      name: 'Test Rule',
      tags: ['tag1'],
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
    };

    const actions = [];
    const systemActions = [];

    const result = transformUpdateBody({ updateBody, actions, systemActions });

    expect(result).toEqual({
      name: 'Test Rule',
      tags: ['tag1'],
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
      actions: [],
      systemActions: [],
    });
  });

  it('should handle flapping being undefined', () => {
    const updateBody = {
      name: 'Test Rule',
      tags: ['tag1'],
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
      flapping: undefined,
    };

    const actions = [];
    const systemActions = [];

    const result = transformUpdateBody({ updateBody, actions, systemActions });

    expect(result).toEqual({
      name: 'Test Rule',
      tags: ['tag1'],
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
      actions: [],
      systemActions: [],
    });
  });

  it('should handle empty actions and systemActions', () => {
    const updateBody = {
      name: 'Test Rule',
      tags: ['tag1'],
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
    };

    const actions = [];
    const systemActions = [];

    const result = transformUpdateBody({ updateBody, actions, systemActions });

    expect(result).toEqual({
      name: 'Test Rule',
      tags: ['tag1'],
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
      actions: [],
      systemActions: [],
    });
  });

  it('should handle missing frequency in actions', () => {
    const updateBody = {
      name: 'Test Rule',
      tags: ['tag1'],
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
    };

    const actions = [
      {
        group: 'default',
        id: 'action1',
        params: { key: 'value' },
      },
    ];

    const systemActions = [];

    const result = transformUpdateBody({ updateBody, actions, systemActions });

    expect(result).toEqual({
      name: 'Test Rule',
      tags: ['tag1'],
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
      actions: [
        {
          group: 'default',
          id: 'action1',
          params: { key: 'value' },
        },
      ],
      systemActions: [],
    });
  });

  it('should exclude artifacts if excludeArtifacts is true', () => {
    const updateBody = {
      name: 'Test Rule',
      tags: ['tag1'],
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
      artifacts: { artifact1: 'value1' },
    };

    const actions = [];
    const systemActions = [];

    const result = transformUpdateBody({
      updateBody,
      actions,
      systemActions,
      excludeArtifacts: true,
    });

    expect(result).toEqual({
      name: 'Test Rule',
      tags: ['tag1'],
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
      actions: [],
      systemActions: [],
    });
  });
});
