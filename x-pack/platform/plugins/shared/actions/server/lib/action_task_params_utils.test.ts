/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractSavedObjectReferences,
  injectSavedObjectReferences,
} from './action_task_params_utils';

describe('extractSavedObjectReferences()', () => {
  test('correctly extracts action id into references array', () => {
    expect(extractSavedObjectReferences('my-action-id', false)).toEqual({
      references: [
        {
          id: 'my-action-id',
          name: 'actionRef',
          type: 'action',
        },
      ],
    });
  });

  test('correctly extracts related saved object into references array', () => {
    const relatedSavedObjects = [
      {
        id: 'abc',
        type: 'alert',
        typeId: 'ruleTypeA',
      },
      {
        id: 'def',
        type: 'action',
        typeId: 'connectorTypeB',
      },
      {
        id: 'xyz',
        type: 'alert',
        typeId: 'ruleTypeB',
        namespace: 'custom',
      },
    ];

    expect(extractSavedObjectReferences('my-action-id', false, relatedSavedObjects)).toEqual({
      references: [
        {
          id: 'my-action-id',
          name: 'actionRef',
          type: 'action',
        },
        {
          id: 'abc',
          name: 'related_alert_0',
          type: 'alert',
        },
        {
          id: 'def',
          name: 'related_action_1',
          type: 'action',
        },
        {
          id: 'xyz',
          name: 'related_alert_2',
          type: 'alert',
        },
      ],
      relatedSavedObjectWithRefs: [
        {
          id: 'related_alert_0',
          type: 'alert',
          typeId: 'ruleTypeA',
        },
        {
          id: 'related_action_1',
          type: 'action',
          typeId: 'connectorTypeB',
        },
        {
          id: 'related_alert_2',
          type: 'alert',
          typeId: 'ruleTypeB',
          namespace: 'custom',
        },
      ],
    });
  });

  test('correctly skips extracting action id if action is in-memory', () => {
    expect(extractSavedObjectReferences('my-action-id', true)).toEqual({
      references: [],
    });
  });

  test('correctly extracts related saved object into references array if isInMemory is true', () => {
    const relatedSavedObjects = [
      {
        id: 'abc',
        type: 'alert',
        typeId: 'ruleTypeA',
      },
      {
        id: 'def',
        type: 'action',
        typeId: 'connectorTypeB',
      },
      {
        id: 'xyz',
        type: 'alert',
        typeId: 'ruleTypeB',
        namespace: 'custom',
      },
    ];

    expect(extractSavedObjectReferences('my-action-id', true, relatedSavedObjects)).toEqual({
      references: [
        {
          id: 'abc',
          name: 'related_alert_0',
          type: 'alert',
        },
        {
          id: 'def',
          name: 'related_action_1',
          type: 'action',
        },
        {
          id: 'xyz',
          name: 'related_alert_2',
          type: 'alert',
        },
      ],
      relatedSavedObjectWithRefs: [
        {
          id: 'related_alert_0',
          type: 'alert',
          typeId: 'ruleTypeA',
        },
        {
          id: 'related_action_1',
          type: 'action',
          typeId: 'connectorTypeB',
        },
        {
          id: 'related_alert_2',
          type: 'alert',
          typeId: 'ruleTypeB',
          namespace: 'custom',
        },
      ],
    });
  });
});

describe('injectSavedObjectReferences()', () => {
  test('correctly returns action id from references array', () => {
    expect(
      injectSavedObjectReferences([
        {
          id: 'my-action-id',
          name: 'actionRef',
          type: 'action',
        },
      ])
    ).toEqual({ actionId: 'my-action-id' });
  });

  test('correctly returns undefined if no action id in references array', () => {
    expect(injectSavedObjectReferences([])).toEqual({});
  });

  test('correctly injects related saved object ids from references array', () => {
    expect(
      injectSavedObjectReferences(
        [
          {
            id: 'my-action-id',
            name: 'actionRef',
            type: 'action',
          },
          {
            id: 'abc',
            name: 'related_alert_0',
            type: 'alert',
          },
          {
            id: 'def',
            name: 'related_action_1',
            type: 'action',
          },
          {
            id: 'xyz',
            name: 'related_alert_2',
            type: 'alert',
          },
        ],
        [
          {
            id: 'related_alert_0',
            type: 'alert',
            typeId: 'ruleTypeA',
          },
          {
            id: 'related_action_1',
            type: 'action',
            typeId: 'connectorTypeB',
          },
          {
            id: 'related_alert_2',
            type: 'alert',
            typeId: 'ruleTypeB',
            namespace: 'custom',
          },
        ]
      )
    ).toEqual({
      actionId: 'my-action-id',
      relatedSavedObjects: [
        {
          id: 'abc',
          type: 'alert',
          typeId: 'ruleTypeA',
        },
        {
          id: 'def',
          type: 'action',
          typeId: 'connectorTypeB',
        },
        {
          id: 'xyz',
          type: 'alert',
          typeId: 'ruleTypeB',
          namespace: 'custom',
        },
      ],
    });
  });

  test('correctly injects related saved object ids from references array if no actionRef', () => {
    expect(
      injectSavedObjectReferences(
        [
          {
            id: 'abc',
            name: 'related_alert_0',
            type: 'alert',
          },
          {
            id: 'def',
            name: 'related_action_1',
            type: 'action',
          },
          {
            id: 'xyz',
            name: 'related_alert_2',
            type: 'alert',
          },
        ],
        [
          {
            id: 'related_alert_0',
            type: 'alert',
            typeId: 'ruleTypeA',
          },
          {
            id: 'related_action_1',
            type: 'action',
            typeId: 'connectorTypeB',
          },
          {
            id: 'related_alert_2',
            type: 'alert',
            typeId: 'ruleTypeB',
            namespace: 'custom',
          },
        ]
      )
    ).toEqual({
      relatedSavedObjects: [
        {
          id: 'abc',
          type: 'alert',
          typeId: 'ruleTypeA',
        },
        {
          id: 'def',
          type: 'action',
          typeId: 'connectorTypeB',
        },
        {
          id: 'xyz',
          type: 'alert',
          typeId: 'ruleTypeB',
          namespace: 'custom',
        },
      ],
    });
  });

  test('correctly keeps related saved object ids if references array is empty', () => {
    expect(
      injectSavedObjectReferences(
        [],
        [
          {
            id: 'abc',
            type: 'alert',
            typeId: 'ruleTypeA',
          },
          {
            id: 'def',
            type: 'action',
            typeId: 'connectorTypeB',
          },
          {
            id: 'xyz',
            type: 'alert',
            typeId: 'ruleTypeB',
            namespace: 'custom',
          },
        ]
      )
    ).toEqual({
      relatedSavedObjects: [
        {
          id: 'abc',
          type: 'alert',
          typeId: 'ruleTypeA',
        },
        {
          id: 'def',
          type: 'action',
          typeId: 'connectorTypeB',
        },
        {
          id: 'xyz',
          type: 'alert',
          typeId: 'ruleTypeB',
          namespace: 'custom',
        },
      ],
    });
  });

  test('correctly skips injecting missing related saved object ids in references array', () => {
    expect(
      injectSavedObjectReferences(
        [
          {
            id: 'my-action-id',
            name: 'actionRef',
            type: 'action',
          },
          {
            id: 'abc',
            name: 'related_alert_0',
            type: 'alert',
          },
        ],
        [
          {
            id: 'related_alert_0',
            type: 'alert',
            typeId: 'ruleTypeA',
          },
          {
            id: 'def',
            type: 'action',
            typeId: 'connectorTypeB',
          },
          {
            id: 'xyz',
            type: 'alert',
            typeId: 'ruleTypeB',
            namespace: 'custom',
          },
        ]
      )
    ).toEqual({
      actionId: 'my-action-id',
      relatedSavedObjects: [
        {
          id: 'abc',
          type: 'alert',
          typeId: 'ruleTypeA',
        },
        {
          id: 'def',
          type: 'action',
          typeId: 'connectorTypeB',
        },
        {
          id: 'xyz',
          type: 'alert',
          typeId: 'ruleTypeB',
          namespace: 'custom',
        },
      ],
    });
  });
});
