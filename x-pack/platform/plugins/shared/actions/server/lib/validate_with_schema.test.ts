/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z as z3 } from '@kbn/zod';
import { z as z4 } from '@kbn/zod/v4';
import {
  validateParams,
  validateConfig,
  validateSecrets,
  validateConnector,
} from './validate_with_schema';
import type {
  ActionType,
  ActionTypeConfig,
  ActionTypeParams,
  ActionTypeSecrets,
  ExecutorType,
  ValidatorServices,
} from '../types';
import { actionsConfigMock } from '../actions_config.mock';
import { getConnectorType } from '../fixtures';

const executor: ExecutorType<{}, {}, {}, void> = async (options) => {
  return { status: 'ok', actionId: options.actionId };
};

const configurationUtilities = actionsConfigMock.create();

test('should validate when there are no validators', () => {
  const actionType = getConnectorType({
    id: 'foo',
    name: 'bar',
    validate: {
      config: { schema: z3.object({ any: z3.array(z3.string()) }).strict() },
      secrets: { schema: z3.object({}).strict() },
      params: { schema: z3.object({}).strict() },
    },
  });
  const testValue = { any: ['old', 'thing'] };

  const result = validateConfig(actionType, testValue, { configurationUtilities });
  expect(result).toEqual(testValue);
});

test('should validate when validators return incoming value', () => {
  const selfValidator = { parse: (value: Record<string, unknown>) => value };
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    executor,
    validate: {
      params: {
        schema: selfValidator,
      },
      config: {
        schema: selfValidator,
      },
      secrets: {
        schema: selfValidator,
      },
      connector: () => null,
    },
  };

  let result;
  const testValue = { any: ['old', 'thing'] };

  result = validateParams(actionType, testValue, { configurationUtilities });
  expect(result).toEqual(testValue);

  result = validateConfig(actionType, testValue, { configurationUtilities });
  expect(result).toEqual(testValue);

  result = validateSecrets(actionType, testValue, { configurationUtilities });
  expect(result).toEqual(testValue);

  result = validateConnector(actionType, { config: testValue, secrets: { user: 'test' } });
  expect(result).toBeNull();
});

test('should validate when validators return different values', () => {
  const returnedValue = { something: { shaped: 'differently' } };
  const selfValidator = { parse: () => returnedValue };
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    executor,
    validate: {
      params: {
        schema: selfValidator,
      },
      config: {
        schema: selfValidator,
      },
      secrets: {
        schema: selfValidator,
      },
      connector: () => null,
    },
  };

  let result;
  const testValue = { any: ['old', 'thing'] };

  result = validateParams(actionType, testValue, { configurationUtilities });
  expect(result).toEqual(returnedValue);

  result = validateConfig(actionType, testValue, { configurationUtilities });
  expect(result).toEqual(returnedValue);

  result = validateSecrets(actionType, testValue, { configurationUtilities });
  expect(result).toEqual(returnedValue);

  result = validateConnector(actionType, { config: testValue, secrets: { user: 'test' } });
  expect(result).toBeNull();
});

test('should throw with expected error when validators fail', () => {
  const erroringValidator = {
    parse: () => {
      throw new Error('test error');
    },
  };
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    executor,
    validate: {
      params: {
        schema: erroringValidator,
      },
      config: {
        schema: erroringValidator,
      },
      secrets: {
        schema: erroringValidator,
      },
      connector: () => 'test error',
    },
  };

  const testValue = { any: ['old', 'thing'] };

  expect(() =>
    validateParams(actionType, testValue, { configurationUtilities })
  ).toThrowErrorMatchingInlineSnapshot(`"error validating action params: test error"`);

  expect(() =>
    validateConfig(actionType, testValue, { configurationUtilities })
  ).toThrowErrorMatchingInlineSnapshot(`"error validating connector type config: test error"`);

  expect(() =>
    validateSecrets(actionType, testValue, { configurationUtilities })
  ).toThrowErrorMatchingInlineSnapshot(`"error validating connector type secrets: test error"`);

  expect(() =>
    validateConnector(actionType, { config: testValue, secrets: { user: 'test' } })
  ).toThrowErrorMatchingInlineSnapshot(`"error validating action type connector: test error"`);
});

test('should work with @kbn/zod v3', () => {
  const testSchema = z3.object({ foo: z3.string() }).strict();
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    executor,
    validate: {
      params: {
        schema: testSchema,
      },
      config: {
        schema: testSchema,
      },
      secrets: {
        schema: testSchema,
      },
      connector: () => null,
    },
  };

  const result = validateParams(actionType, { foo: 'bar' }, { configurationUtilities });
  expect(result).toEqual({ foo: 'bar' });

  expect(() => validateParams(actionType, { bar: 2 }, { configurationUtilities }))
    .toThrowErrorMatchingInlineSnapshot(`
    "error validating action params: 2 errors:
     [1]: Unrecognized key(s) in object: 'bar';
     [2]: Field \\"foo\\": Required"
  `);
});

test('should work with @kbn/zod v4', () => {
  const testSchema = z4.object({ foo: z4.string() }).strict();
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    executor,
    validate: {
      params: {
        schema: testSchema,
      },
      config: {
        schema: testSchema,
      },
      secrets: {
        schema: testSchema,
      },
      connector: () => null,
    },
  };

  const result = validateParams(actionType, { foo: 'bar' }, { configurationUtilities });
  expect(result).toEqual({ foo: 'bar' });

  expect(() => validateParams(actionType, { bar: 2 }, { configurationUtilities }))
    .toThrowErrorMatchingInlineSnapshot(`
    "error validating action params: ✖ Unrecognized key: \\"bar\\"
    ✖ Invalid input: expected string, received undefined
      → at foo"
  `);
});

describe('Zod v4 config and secrets', () => {
  test('validateConfig uses z.prettifyError for v4 schema failures', () => {
    const configSchema = z4.object({ apiUrl: z4.string() }).strict();
    const actionType: ActionType = {
      id: 'foo',
      name: 'bar',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      executor,
      validate: {
        params: { schema: z4.object({}) },
        config: { schema: configSchema },
        secrets: { schema: z4.object({}) },
        connector: () => null,
      },
    };

    const result = validateConfig(
      actionType,
      { apiUrl: 'https://example.com' },
      { configurationUtilities }
    );
    expect(result).toEqual({ apiUrl: 'https://example.com' });

    expect(() => validateConfig(actionType, { apiUrl: 123 }, { configurationUtilities })).toThrow(
      /error validating connector type config/
    );
    expect(() => validateConfig(actionType, { apiUrl: 123 }, { configurationUtilities })).toThrow(
      /apiUrl|string|number/
    );
  });

  test('validateSecrets uses z.prettifyError for v4 schema failures', () => {
    const secretsSchema = z4.object({ token: z4.string() }).strict();
    const actionType: ActionType = {
      id: 'foo',
      name: 'bar',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      executor,
      validate: {
        params: { schema: z4.object({}) },
        config: { schema: z4.object({}) },
        secrets: { schema: secretsSchema },
        connector: () => null,
      },
    };

    const result = validateSecrets(
      actionType,
      { token: 'secret-token' },
      { configurationUtilities }
    );
    expect(result).toEqual({ token: 'secret-token' });

    expect(() => validateSecrets(actionType, { token: 456 }, { configurationUtilities })).toThrow(
      /error validating connector type secrets/
    );
    expect(() => validateSecrets(actionType, { token: 456 }, { configurationUtilities })).toThrow(
      /token|string|number/
    );
  });
});

describe('schema transforms and complex schemas', () => {
  test('returns transformed value when schema has transform', () => {
    const transformSchema = z3.object({ count: z3.number() }).transform((v) => ({
      ...v,
      doubled: v.count * 2,
    }));
    const actionType: ActionType = {
      id: 'foo',
      name: 'bar',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      executor,
      validate: {
        params: { schema: transformSchema },
        config: { schema: z3.object({}) },
        secrets: { schema: z3.object({}) },
        connector: () => null,
      },
    };

    const result = validateParams(actionType, { count: 5 }, { configurationUtilities });
    expect(result).toEqual({ count: 5, doubled: 10 });
  });

  test('validates optional and nullable fields', () => {
    const schema = z3.object({
      required: z3.string(),
      optional: z3.string().optional(),
      nullable: z3.string().nullable(),
    });
    const actionType: ActionType = {
      id: 'foo',
      name: 'bar',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      executor,
      validate: {
        params: { schema },
        config: { schema: z3.object({}) },
        secrets: { schema: z3.object({}) },
        connector: () => null,
      },
    };

    const result = validateParams(
      actionType,
      { required: 'x', nullable: null },
      { configurationUtilities }
    );
    expect(result).toEqual({ required: 'x', nullable: null });
  });

  test('rejects null, undefined, and missing key for required z3.string()', () => {
    const schema = z3.object({
      required: z3.string(),
    });
    const actionType: ActionType = {
      id: 'foo',
      name: 'bar',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      executor,
      validate: {
        params: { schema },
        config: { schema: z3.object({}) },
        secrets: { schema: z3.object({}) },
        connector: () => null,
      },
    };

    expect(() =>
      validateParams(actionType, { required: null }, { configurationUtilities })
    ).toThrow(/error validating action params/);

    expect(() =>
      validateParams(actionType, { required: undefined }, { configurationUtilities })
    ).toThrow(/error validating action params/);

    expect(() => validateParams(actionType, {}, { configurationUtilities })).toThrow(
      /error validating action params/
    );
  });

  test('validates union schema', () => {
    const unionSchema = z3.union([
      z3.object({ type: z3.literal('a'), value: z3.string() }),
      z3.object({ type: z3.literal('b'), value: z3.number() }),
    ]);
    const actionType: ActionType = {
      id: 'foo',
      name: 'bar',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      executor,
      validate: {
        params: { schema: unionSchema },
        config: { schema: z3.object({}) },
        secrets: { schema: z3.object({}) },
        connector: () => null,
      },
    };

    const resultA = validateParams(
      actionType,
      { type: 'a', value: 'hello' },
      { configurationUtilities }
    );
    expect(resultA).toEqual({ type: 'a', value: 'hello' });

    const resultB = validateParams(
      actionType,
      { type: 'b', value: 42 },
      { configurationUtilities }
    );
    expect(resultB).toEqual({ type: 'b', value: 42 });

    expect(() =>
      validateParams(actionType, { type: 'c', value: 1 }, { configurationUtilities })
    ).toThrow();
  });
});

test('should validate when custom validator is defined', () => {
  const schemaValidator = {
    parse: (value: ActionTypeParams | ActionTypeConfig | ActionTypeSecrets) => value,
  };
  const customValidator = jest.fn();

  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    executor,
    validate: {
      params: {
        schema: schemaValidator,
        customValidator,
      },
      config: {
        schema: schemaValidator,
        customValidator,
      },
      secrets: {
        schema: schemaValidator,
        customValidator,
      },
    },
  };

  let result;
  const testValue = { any: ['old', 'thing'] };

  result = validateParams(actionType, testValue, { configurationUtilities });
  expect(result).toEqual(testValue);

  result = validateConfig(actionType, testValue, { configurationUtilities });
  expect(result).toEqual(testValue);

  result = validateSecrets(actionType, testValue, { configurationUtilities });
  expect(result).toEqual(testValue);

  expect(customValidator).toBeCalledTimes(3);
});

test('should throw an error when custom validators fail', () => {
  const schemaValidator = {
    parse: (value: ActionTypeParams | ActionTypeConfig | ActionTypeSecrets) => value,
  };
  const customValidator = (
    value: ActionTypeParams | ActionTypeConfig | ActionTypeSecrets,
    services: ValidatorServices
  ) => {
    throw new Error('test error');
  };

  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    executor,
    validate: {
      params: {
        schema: schemaValidator,
        customValidator,
      },
      config: {
        schema: schemaValidator,
        customValidator,
      },
      secrets: {
        schema: schemaValidator,
        customValidator,
      },
    },
  };

  const testValue = { any: ['old', 'thing'] };

  expect(() =>
    validateParams(actionType, testValue, { configurationUtilities })
  ).toThrowErrorMatchingInlineSnapshot(`"error validating action params: test error"`);

  expect(() =>
    validateConfig(actionType, testValue, { configurationUtilities })
  ).toThrowErrorMatchingInlineSnapshot(`"error validating connector type config: test error"`);

  expect(() =>
    validateSecrets(actionType, testValue, { configurationUtilities })
  ).toThrowErrorMatchingInlineSnapshot(`"error validating connector type secrets: test error"`);
});

describe('validateSecrets', () => {
  const secretsSchema = z3.object({ foo: z3.string() }).strict();
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    executor,
    validate: {
      params: { schema: secretsSchema },
      config: { schema: secretsSchema },
      secrets: { schema: secretsSchema },
    },
  };

  test('should not run validation when secrets are undefined', () => {
    expect(() =>
      validateSecrets(actionType, undefined, { configurationUtilities })
    ).not.toThrowError();
  });

  test('should not run validation when secrets are null', () => {
    expect(() => validateSecrets(actionType, null, { configurationUtilities })).not.toThrowError();
  });

  test('should throw when a required field is null', () => {
    expect(() => validateSecrets(actionType, { foo: null }, { configurationUtilities })).toThrow(
      /error validating connector type secrets/
    );
  });

  test('should throw when a required field is undefined', () => {
    expect(() =>
      validateSecrets(actionType, { foo: undefined }, { configurationUtilities })
    ).toThrow(/error validating connector type secrets/);
  });

  test('should throw when a required field is missing', () => {
    expect(() => validateSecrets(actionType, {}, { configurationUtilities })).toThrow(
      /error validating connector type secrets/
    );
  });
});

describe('validateConfig — null and undefined inputs', () => {
  const configSchema = z3.object({ apiUrl: z3.string() }).strict();
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    executor,
    validate: {
      params: { schema: z3.object({}) },
      config: { schema: configSchema },
      secrets: { schema: z3.object({}) },
      connector: () => null,
    },
  };

  test('should throw when config is null', () => {
    expect(() => validateConfig(actionType, null, { configurationUtilities })).toThrow(
      /error validating connector type config/
    );
  });

  test('should throw when config is undefined', () => {
    expect(() => validateConfig(actionType, undefined, { configurationUtilities })).toThrow(
      /error validating connector type config/
    );
  });

  test('should throw when a required field is null', () => {
    expect(() => validateConfig(actionType, { apiUrl: null }, { configurationUtilities })).toThrow(
      /error validating connector type config/
    );
  });

  test('should throw when a required field is undefined', () => {
    expect(() =>
      validateConfig(actionType, { apiUrl: undefined }, { configurationUtilities })
    ).toThrow(/error validating connector type config/);
  });

  test('should throw when a required field is missing', () => {
    expect(() => validateConfig(actionType, {}, { configurationUtilities })).toThrow(
      /error validating connector type config/
    );
  });
});

describe('validateParams — null and undefined inputs', () => {
  const paramsSchema = z3.object({ id: z3.string() }).strict();
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    executor,
    validate: {
      params: { schema: paramsSchema },
      config: { schema: z3.object({}) },
      secrets: { schema: z3.object({}) },
      connector: () => null,
    },
  };

  test('should throw when params is null', () => {
    expect(() => validateParams(actionType, null, { configurationUtilities })).toThrow(
      /error validating action params/
    );
  });

  test('should throw when params is undefined', () => {
    expect(() => validateParams(actionType, undefined, { configurationUtilities })).toThrow(
      /error validating action params/
    );
  });

  test('should throw when a required field is null', () => {
    expect(() => validateParams(actionType, { id: null }, { configurationUtilities })).toThrow(
      /error validating action params/
    );
  });

  test('should throw when a required field is undefined', () => {
    expect(() => validateParams(actionType, { id: undefined }, { configurationUtilities })).toThrow(
      /error validating action params/
    );
  });

  test('should throw when a required field is missing', () => {
    expect(() => validateParams(actionType, {}, { configurationUtilities })).toThrow(
      /error validating action params/
    );
  });
});

describe('validateConnectors', () => {
  const testValue = { any: ['old', 'thing'] };
  const selfValidator = { parse: (value: Record<string, unknown>) => value };
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    executor,
    validate: {
      params: {
        schema: selfValidator,
      },
      config: {
        schema: selfValidator,
      },
      secrets: {
        schema: selfValidator,
      },
      connector: () => null,
    },
  };

  test('should throw error when connector config is null', () => {
    expect(() =>
      validateConnector(actionType, { config: null, secrets: { user: 'test' } })
    ).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: config must be defined"`
    );
  });

  test('should throw error when connector config is undefined', () => {
    expect(() =>
      validateConnector(actionType, { config: undefined, secrets: { user: 'test' } })
    ).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: config must be defined"`
    );
  });

  test('should throw error when connector secrets is null', () => {
    expect(() =>
      validateConnector(actionType, { config: testValue, secrets: null })
    ).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: secrets must be defined"`
    );
  });

  test('should throw error when connector secrets is undefined', () => {
    expect(() =>
      validateConnector(actionType, { config: testValue, secrets: undefined })
    ).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: secrets must be defined"`
    );
  });
});
