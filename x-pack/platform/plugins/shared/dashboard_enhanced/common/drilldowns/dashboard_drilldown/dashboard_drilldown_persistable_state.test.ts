/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createExtract, createInject } from './dashboard_drilldown_persistable_state';
import { SerializedEvent } from '@kbn/ui-actions-enhanced-plugin/common';

const drilldownId = 'test_id';
const extract = createExtract({ drilldownId });
const inject = createInject({ drilldownId });

const state: SerializedEvent = {
  eventId: 'event_id',
  triggers: [],
  action: {
    factoryId: drilldownId,
    name: 'name',
    config: {
      dashboardId: 'dashboardId_1',
    },
  },
};

test('should extract and injected dashboard reference', () => {
  const { state: extractedState, references } = extract(state);
  expect(extractedState).not.toEqual(state);
  expect(extractedState.action.config.dashboardId).toBeUndefined();
  expect(references).toMatchInlineSnapshot(`
    Array [
      Object {
        "id": "dashboardId_1",
        "name": "drilldown:test_id:event_id:dashboardId",
        "type": "dashboard",
      },
    ]
  `);

  let injectedState = inject(extractedState, references);
  expect(injectedState).toEqual(state);

  references[0].id = 'dashboardId_2';

  injectedState = inject(extractedState, references);
  expect(injectedState).not.toEqual(extractedState);
  expect(injectedState.action.config.dashboardId).toBe('dashboardId_2');
});
