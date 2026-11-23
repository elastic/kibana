/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlToolType } from './tool_type';
import type { LegacyEsqlToolConfig } from './esql_legacy';
import type { EsqlToolConfig } from '@kbn/agent-builder-common/tools/types/esql';
import { ESQL_CONFIG_SCHEMA_VERSION } from '@kbn/agent-builder-common/tools/types/esql';

describe('getEsqlToolType convertFromPersistence', () => {
  it('converts legacy field types and stringifies object defaults', () => {
    const legacyConfig: LegacyEsqlToolConfig = {
      schema_version: undefined,
      query: 'FROM idx | WHERE a == ?a',
      params: {
        a: {
          type: 'text',
          description: 'a',
          optional: true,
          defaultValue: 'hello',
        },
        b: {
          type: 'long',
          description: 'b',
          optional: true,
          defaultValue: 3.14,
        },
        c: {
          type: 'double',
          description: 'c',
          optional: true,
          defaultValue: 1.25,
        },
        d: {
          type: 'object',
          description: 'd',
          optional: true,
          defaultValue: { k: 'v' },
        },
        e: {
          type: 'boolean',
          description: 'e',
          optional: true,
          defaultValue: false,
        },
        f: {
          type: 'date',
          description: 'f',
          optional: true,
          defaultValue: '2023-01-01T00:00:00Z',
        },
        g: {
          type: 'nested',
          description: 'g',
          optional: true,
          defaultValue: [{ k: 'v' }, { k: 'w' }],
        },
      },
    };

    const toolType = getEsqlToolType();
    const converted = toolType.convertFromPersistence!(legacyConfig as any, {} as any);

    expect(converted).toEqual<EsqlToolConfig>({
      query: legacyConfig.query,
      params: {
        a: { type: 'string', description: 'a', optional: true, defaultValue: 'hello' },
        b: { type: 'integer', description: 'b', optional: true, defaultValue: 3.14 },
        c: { type: 'float', description: 'c', optional: true, defaultValue: 1.25 },
        d: {
          type: 'string',
          description: 'd',
          optional: true,
          defaultValue: JSON.stringify({ k: 'v' }),
        },
        e: { type: 'boolean', description: 'e', optional: true, defaultValue: false },
        f: { type: 'date', description: 'f', optional: true, defaultValue: '2023-01-01T00:00:00Z' },
        g: {
          type: 'string',
          description: 'g',
          optional: true,
          defaultValue: JSON.stringify([{ k: 'v' }, { k: 'w' }]),
        },
      },
    });
  });

  it('returns non-legacy configs unchanged', () => {
    const persistedConfig: {
      schema_version: number;
      query: string;
      params: EsqlToolConfig['params'];
    } = {
      schema_version: ESQL_CONFIG_SCHEMA_VERSION,
      query: 'FROM idx | WHERE a == ?a',
      params: {
        a: { type: 'string', description: 'a', optional: true, defaultValue: 'hello' },
      },
    };

    const toolType = getEsqlToolType();
    const converted = toolType.convertFromPersistence!(persistedConfig as any, {} as any);

    expect(converted).toEqual<EsqlToolConfig>({
      query: persistedConfig.query,
      params: persistedConfig.params,
    });
  });

  it('preserves include_frozen through a persistence round trip', () => {
    const config: EsqlToolConfig = {
      query: 'FROM logs-*',
      params: {},
      include_frozen: true,
    };

    const toolType = getEsqlToolType();
    const persisted = toolType.convertToPersistence!(config, {} as any);
    const converted = toolType.convertFromPersistence!(persisted, {} as any);

    expect(converted).toEqual<EsqlToolConfig>(config);
  });
});

describe('getEsqlToolType configuration schemas', () => {
  const { createSchema, updateSchema } = getEsqlToolType();

  it('accepts include_frozen on create and update', () => {
    expect(
      createSchema.validate({ query: 'FROM logs-*', params: {}, include_frozen: true })
    ).toMatchObject({ include_frozen: true });
    expect(updateSchema.validate({ include_frozen: false })).toMatchObject({
      include_frozen: false,
    });
  });

  it('rejects a non-boolean include_frozen', () => {
    expect(() =>
      createSchema.validate({ query: 'FROM logs-*', params: {}, include_frozen: 'yes' })
    ).toThrow();
  });
});
