/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { validateConfig, validateParams } from '@kbn/actions-plugin/server/lib';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import {
  ActionParamsType,
  ConnectorTypeConfigType,
  ESIndexConnectorType,
  ESIndexConnectorTypeExecutorOptions,
  getConnectorType,
} from '.';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { loggerMock } from '@kbn/logging-mocks';
import { Logger } from '@kbn/logging';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { AlertHistoryEsIndexConnectorId } from '@kbn/actions-plugin/common';

const services = actionsMock.createServices();
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();

let connectorType: ESIndexConnectorType;
let configurationUtilities: ActionsConfigurationUtilities;
let connectorUsageCollector: ConnectorUsageCollector;

beforeEach(() => {
  jest.resetAllMocks();
  configurationUtilities = actionsConfigMock.create();
  connectorType = getConnectorType();
  connectorUsageCollector = new ConnectorUsageCollector({
    logger: mockedLogger,
    connectorId: 'test-connector-id',
  });
});

describe('connector registration', () => {
  test('returns connector type', () => {
    expect(connectorType.id).toEqual('.index');
    expect(connectorType.name).toEqual('Index');
  });
});

describe('config validation', () => {
  test('config validation succeeds when config is valid', () => {
    const config: Record<string, unknown> = {
      index: 'testing-123',
      refresh: false,
    };

    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
      ...config,
      index: 'testing-123',
      refresh: false,
      executionTimeField: null,
    });

    config.executionTimeField = 'field-123';
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
      ...config,
      index: 'testing-123',
      refresh: false,
      executionTimeField: 'field-123',
    });

    config.executionTimeField = null;
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
      ...config,
      index: 'testing-123',
      refresh: false,
      executionTimeField: null,
    });

    delete config.index;

    expect(() => {
      validateConfig(connectorType, { index: 666 }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [index]: expected value of type [string] but got [number]"`
    );
    delete config.executionTimeField;

    expect(() => {
      validateConfig(
        connectorType,
        { index: 'testing-123', executionTimeField: true },
        { configurationUtilities }
      );
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action type config: [executionTimeField]: types that failed validation:
- [executionTimeField.0]: expected value of type [string] but got [boolean]
- [executionTimeField.1]: expected value to equal [null]"
`);

    delete config.refresh;
    expect(() => {
      validateConfig(
        connectorType,
        { index: 'testing-123', refresh: 'foo' },
        { configurationUtilities }
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [refresh]: expected value of type [boolean] but got [string]"`
    );
  });

  test('config validation fails when config is not valid', () => {
    const baseConfig: Record<string, unknown> = {
      indeX: 'bob',
    };

    expect(() => {
      validateConfig(connectorType, baseConfig, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [index]: expected value of type [string] but got [undefined]"`
    );
  });
});

describe('params validation', () => {
  test('params validation succeeds when params is valid', () => {
    const params: Record<string, unknown> = {
      documents: [{ rando: 'thing' }],
      indexOverride: null,
    };
    expect(validateParams(connectorType, params, { configurationUtilities }))
      .toMatchInlineSnapshot(`
        Object {
          "documents": Array [
            Object {
              "rando": "thing",
            },
          ],
          "indexOverride": null,
        }
    `);
  });

  test('params validation fails when params is not valid', () => {
    expect(() => {
      validateParams(connectorType, { documents: [{}], jim: 'bob' }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [jim]: definition for this key is missing"`
    );

    expect(() => {
      validateParams(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [documents]: expected value of type [array] but got [undefined]"`
    );

    expect(() => {
      validateParams(
        connectorType,
        { documents: ['should be an object'] },
        { configurationUtilities }
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [documents.0]: could not parse record value from json input"`
    );
  });
});

describe('execute()', () => {
  test('ensure parameters are as expected', async () => {
    const secrets = {};
    let config: ConnectorTypeConfigType;
    let params: ActionParamsType;
    let executorOptions: ESIndexConnectorTypeExecutorOptions;

    // minimal params
    config = { index: 'index-value', refresh: false, executionTimeField: null };
    params = {
      documents: [{ jim: 'bob' }],
      indexOverride: null,
    };

    const actionId = 'some-id';

    executorOptions = {
      actionId,
      config,
      secrets,
      params,
      services,
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    };
    const scopedClusterClient = elasticsearchClientMock
      .createClusterClient()
      .asScoped().asCurrentUser;
    await connectorType.executor({
      ...executorOptions,
      services: { ...services, scopedClusterClient },
    });

    expect(scopedClusterClient.bulk.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "body": Array [
                  Object {
                    "index": Object {
                      "op_type": "create",
                    },
                  },
                  Object {
                    "jim": "bob",
                  },
                ],
                "index": "index-value",
                "refresh": false,
              },
            ],
          ]
    `);

    // full params
    config = { index: 'index-value', executionTimeField: 'field_to_use_for_time', refresh: true };
    params = {
      documents: [{ jimbob: 'jr' }],
      indexOverride: null,
    };

    executorOptions = {
      actionId,
      config,
      secrets,
      params,
      services,
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    };
    scopedClusterClient.bulk.mockClear();
    await connectorType.executor({
      ...executorOptions,
      services: { ...services, scopedClusterClient },
    });

    const calls = scopedClusterClient.bulk.mock.calls;
    const timeValue = (
      ((calls[0][0] as estypes.BulkRequest)?.body as unknown[])[1] as Record<string, unknown>
    ).field_to_use_for_time;
    expect(timeValue).toBeInstanceOf(Date);
    delete (((calls[0][0] as estypes.BulkRequest)?.body as unknown[])[1] as Record<string, unknown>)
      .field_to_use_for_time;
    expect(calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "body": Array [
                Object {
                  "index": Object {
                    "op_type": "create",
                  },
                },
                Object {
                  "jimbob": "jr",
                },
              ],
              "index": "index-value",
              "refresh": true,
            },
          ],
        ]
    `);

    // minimal params
    config = { index: 'index-value', executionTimeField: null, refresh: false };
    params = {
      documents: [{ jim: 'bob' }],
      indexOverride: null,
    };

    executorOptions = {
      actionId,
      config,
      secrets,
      params,
      services,
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    };

    scopedClusterClient.bulk.mockClear();
    await connectorType.executor({
      ...executorOptions,
      services: { ...services, scopedClusterClient },
    });

    expect(scopedClusterClient.bulk.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "body": Array [
              Object {
                "index": Object {
                  "op_type": "create",
                },
              },
              Object {
                "jim": "bob",
              },
            ],
            "index": "index-value",
            "refresh": false,
          },
        ],
      ]
    `);

    // multiple documents
    config = { index: 'index-value', executionTimeField: null, refresh: false };
    params = {
      documents: [{ a: 1 }, { b: 2 }],
      indexOverride: null,
    };

    executorOptions = {
      actionId,
      config,
      secrets,
      params,
      services,
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    };
    scopedClusterClient.bulk.mockClear();
    await connectorType.executor({
      ...executorOptions,
      services: { ...services, scopedClusterClient },
    });

    expect(scopedClusterClient.bulk.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "body": Array [
                  Object {
                    "index": Object {
                      "op_type": "create",
                    },
                  },
                  Object {
                    "a": 1,
                  },
                  Object {
                    "index": Object {
                      "op_type": "create",
                    },
                  },
                  Object {
                    "b": 2,
                  },
                ],
                "index": "index-value",
                "refresh": false,
              },
            ],
          ]
    `);
  });

  test('renders parameter templates as expected', async () => {
    expect(connectorType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      documents: [{ hello: '{{who}}' }],
      indexOverride: null,
    };
    const variables = {
      who: 'world',
    };
    const renderedParams = connectorType.renderParameterTemplates!(
      mockedLogger,
      paramsWithTemplates,
      variables,
      'action-type-id'
    );
    expect(renderedParams).toMatchInlineSnapshot(`
      Object {
        "documents": Array [
          Object {
            "hello": "world",
          },
        ],
        "indexOverride": null,
      }
    `);
  });

  test('ignores indexOverride for generic es index connector', async () => {
    expect(connectorType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      documents: [{ hello: '{{who}}' }],
      indexOverride: 'hello-world',
    };
    const variables = {
      who: 'world',
    };
    const renderedParams = connectorType.renderParameterTemplates!(
      mockedLogger,
      paramsWithTemplates,
      variables,
      'action-type-id'
    );
    expect(renderedParams).toMatchInlineSnapshot(`
      Object {
        "documents": Array [
          Object {
            "hello": "world",
          },
        ],
        "indexOverride": null,
      }
    `);
  });

  test('renders parameter templates as expected for preconfigured alert history connector', async () => {
    expect(connectorType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      documents: [{ hello: '{{who}}' }],
      indexOverride: null,
    };
    const variables = {
      date: '2021-01-01T00:00:00.000Z',
      rule: {
        id: 'rule-id',
        name: 'rule-name',
        type: 'rule-type',
      },
      context: {
        contextVar1: 'contextValue1',
        contextVar2: 'contextValue2',
      },
      params: {
        ruleParam: 1,
        ruleParamString: 'another param',
      },
      tags: ['abc', 'xyz'],
      alert: {
        id: 'alert-id',
        actionGroup: 'action-group-id',
        actionGroupName: 'Action Group',
      },
      state: {
        alertStateValue: true,
        alertStateAnotherValue: 'yes',
      },
    };
    const renderedParams = connectorType.renderParameterTemplates!(
      mockedLogger,
      paramsWithTemplates,
      variables,
      AlertHistoryEsIndexConnectorId
    );
    expect(renderedParams).toMatchInlineSnapshot(`
      Object {
        "documents": Array [
          Object {
            "@timestamp": "2021-01-01T00:00:00.000Z",
            "event": Object {
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "actionGroup": "action-group-id",
                "actionGroupName": "Action Group",
                "context": Object {
                  "rule-type": Object {
                    "contextVar1": "contextValue1",
                    "contextVar2": "contextValue2",
                  },
                },
                "id": "alert-id",
              },
            },
            "rule": Object {
              "id": "rule-id",
              "name": "rule-name",
              "params": Object {
                "rule-type": Object {
                  "ruleParam": 1,
                  "ruleParamString": "another param",
                },
              },
              "type": "rule-type",
            },
            "tags": Array [
              "abc",
              "xyz",
            ],
          },
        ],
        "indexOverride": null,
      }
    `);
  });

  test('passes through indexOverride for preconfigured alert history connector', async () => {
    expect(connectorType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      documents: [{ hello: '{{who}}' }],
      indexOverride: 'hello-world',
    };
    const variables = {
      date: '2021-01-01T00:00:00.000Z',
      rule: {
        id: 'rule-id',
        name: 'rule-name',
        type: 'rule-type',
      },
      context: {
        contextVar1: 'contextValue1',
        contextVar2: 'contextValue2',
      },
      params: {
        ruleParam: 1,
        ruleParamString: 'another param',
      },
      tags: ['abc', 'xyz'],
      alert: {
        id: 'alert-id',
        actionGroup: 'action-group-id',
        actionGroupName: 'Action Group',
      },
      state: {
        alertStateValue: true,
        alertStateAnotherValue: 'yes',
      },
    };
    const renderedParams = connectorType.renderParameterTemplates!(
      mockedLogger,
      paramsWithTemplates,
      variables,
      AlertHistoryEsIndexConnectorId
    );
    expect(renderedParams).toMatchInlineSnapshot(`
      Object {
        "documents": Array [
          Object {
            "@timestamp": "2021-01-01T00:00:00.000Z",
            "event": Object {
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "actionGroup": "action-group-id",
                "actionGroupName": "Action Group",
                "context": Object {
                  "rule-type": Object {
                    "contextVar1": "contextValue1",
                    "contextVar2": "contextValue2",
                  },
                },
                "id": "alert-id",
              },
            },
            "rule": Object {
              "id": "rule-id",
              "name": "rule-name",
              "params": Object {
                "rule-type": Object {
                  "ruleParam": 1,
                  "ruleParamString": "another param",
                },
              },
              "type": "rule-type",
            },
            "tags": Array [
              "abc",
              "xyz",
            ],
          },
        ],
        "indexOverride": "hello-world",
      }
    `);
  });

  test('throws error for preconfigured alert history index when no variables are available', async () => {
    expect(connectorType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      documents: [{ hello: '{{who}}' }],
      indexOverride: null,
    };
    const variables = {};

    expect(() =>
      connectorType.renderParameterTemplates!(
        mockedLogger,
        paramsWithTemplates,
        variables,
        AlertHistoryEsIndexConnectorId
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"error creating alert history document for ${AlertHistoryEsIndexConnectorId} connector"`
    );
  });

  test('resolves with an error when an error occurs in the indexing operation', async () => {
    const secrets = {};
    // minimal params
    const config = { index: 'index-value', refresh: false, executionTimeField: null };
    const params = {
      documents: [{ '': 'bob' }],
      indexOverride: null,
    };

    const actionId = 'some-id';
    const scopedClusterClient = elasticsearchClientMock
      .createClusterClient()
      .asScoped().asCurrentUser;
    scopedClusterClient.bulk.mockResponse({
      took: 0,
      errors: true,
      items: [
        {
          create: {
            _index: 'indexme',
            _id: '7buTjHQB0SuNSiS9Hayt',
            status: 400,
            error: {
              type: 'document_parsing_exception',
              reason: `[1:10] failed to parse field [bytes] of type [long] in document with id '39XQLIoB8kAjguvyIMeJ'. Preview of field's value: 'foo'`,
              caused_by: {
                type: 'illegal_argument_exception',
                reason: `For input string: \"foo\"`,
              },
            },
          },
        },
        {
          index: {
            _index: 'indexme',
            _id: '7buTjHQB0SuNSiS9Hayt',
            status: 400,
            error: {
              type: 'mapper_parsing_exception',
              reason: 'failed to parse',
              caused_by: {
                type: 'illegal_argument_exception',
                reason: 'field name cannot be an empty string',
              },
            },
          },
        },
      ],
    });

    expect(
      await connectorType.executor({
        actionId,
        config,
        secrets,
        params,
        services: { ...services, scopedClusterClient },
        configurationUtilities,
        logger: mockedLogger,
        connectorUsageCollector,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "message": "error indexing documents",
        "serviceMessage": "[1:10] failed to parse field [bytes] of type [long] in document with id '39XQLIoB8kAjguvyIMeJ'. Preview of field's value: 'foo';failed to parse (For input string: \\"foo\\";field name cannot be an empty string)",
        "status": "error",
      }
    `);
  });

  test('resolves with an error when an error occurs in the indexing operation - malformed response', async () => {
    const secrets = {};
    // minimal params
    const config = { index: 'index-value', refresh: false, executionTimeField: null };
    const params = {
      documents: [{ '': 'bob' }],
      indexOverride: null,
    };

    const actionId = 'some-id';
    const scopedClusterClient = elasticsearchClientMock
      .createClusterClient()
      .asScoped().asCurrentUser;
    // @ts-expect-error
    scopedClusterClient.bulk.mockResponse({
      took: 0,
      errors: true,
    });

    expect(
      await connectorType.executor({
        actionId,
        config,
        secrets,
        params,
        services: { ...services, scopedClusterClient },
        configurationUtilities,
        logger: mockedLogger,
        connectorUsageCollector,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "message": "error indexing documents",
        "serviceMessage": "Indexing error but no reason returned.",
        "status": "error",
      }
    `);
  });

  test('resolves with an error when an error occurs in the indexing operation - malformed error response', async () => {
    const secrets = {};
    // minimal params
    const config = { index: 'index-value', refresh: false, executionTimeField: null };
    const params = {
      documents: [{ '': 'bob' }],
      indexOverride: null,
    };

    const actionId = 'some-id';
    const scopedClusterClient = elasticsearchClientMock
      .createClusterClient()
      .asScoped().asCurrentUser;
    scopedClusterClient.bulk.mockResponse({
      took: 0,
      errors: true,
      items: [
        {
          create: {
            _index: 'indexme',
            _id: '7buTjHQB0SuNSiS9Hayt',
            status: 400,
            error: {
              type: 'document_parsing_exception',
              reason: `[1:10] failed to parse field [bytes] of type [long] in document with id '39XQLIoB8kAjguvyIMeJ'. Preview of field's value: 'foo'`,
              caused_by: {
                type: 'illegal_argument_exception',
                reason: `For input string: \"foo\"`,
              },
            },
          },
        },
        {
          index: {
            _index: 'indexme',
            _id: '7buTjHQB0SuNSiS9Hayt',
            status: 400,
          },
        },
      ],
    });

    expect(
      await connectorType.executor({
        actionId,
        config,
        secrets,
        params,
        services: { ...services, scopedClusterClient },
        configurationUtilities,
        logger: mockedLogger,
        connectorUsageCollector,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "message": "error indexing documents",
        "serviceMessage": "[1:10] failed to parse field [bytes] of type [long] in document with id '39XQLIoB8kAjguvyIMeJ'. Preview of field's value: 'foo' (For input string: \\"foo\\")",
        "status": "error",
      }
    `);
  });

  test('resolves with an error when an error occurs in the indexing operation - error with no reason', async () => {
    const secrets = {};
    // minimal params
    const config = { index: 'index-value', refresh: false, executionTimeField: null };
    const params = {
      documents: [{ '': 'bob' }],
      indexOverride: null,
    };

    const actionId = 'some-id';
    const scopedClusterClient = elasticsearchClientMock
      .createClusterClient()
      .asScoped().asCurrentUser;
    scopedClusterClient.bulk.mockResponse({
      took: 0,
      errors: true,
      items: [
        {
          create: {
            _index: 'indexme',
            _id: '7buTjHQB0SuNSiS9Hayt',
            status: 400,
            error: {
              type: 'document_parsing_exception',
              caused_by: {
                type: 'illegal_argument_exception',
              },
            },
          },
        },
        {
          index: {
            _index: 'indexme',
            _id: '7buTjHQB0SuNSiS9Hayt',
            status: 400,
            error: {
              type: 'mapper_parsing_exception',
              reason: 'failed to parse',
              caused_by: {
                type: 'illegal_argument_exception',
              },
            },
          },
        },
      ],
    });

    expect(
      await connectorType.executor({
        actionId,
        config,
        secrets,
        params,
        services: { ...services, scopedClusterClient },
        configurationUtilities,
        logger: mockedLogger,
        connectorUsageCollector,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "message": "error indexing documents",
        "serviceMessage": "failed to parse",
        "status": "error",
      }
    `);
  });
});
