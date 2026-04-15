/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCreateParams } from '@kbn/agent-builder-server';
import type { ToolTypeUpdateParams } from '../../tool_provider';
import type { ToolDocument } from './types';
import type { ToolProperties } from './storage';
import { createAttributes, fromEs, updateDocument } from './converters';
import { ToolType } from '@kbn/agent-builder-common';

const creationDate = '2024-09-04T06:44:17.944Z';
const updateDate = '2025-08-04T06:44:19.123Z';

describe('fromEs', () => {
  it('converts a tool document to its definition format', () => {
    const document: ToolDocument = {
      _id: '_id',
      _source: {
        id: 'id',
        type: ToolType.esql,
        space: 'space',
        description: 'description',
        configuration: {
          configProp: 'dolly',
        },
        tags: [],
        created_at: creationDate,
        updated_at: updateDate,
      },
    };

    const definition = fromEs(document);

    expect(definition).toEqual({
      id: 'id',
      type: ToolType.esql,
      description: 'description',
      configuration: {
        configProp: 'dolly',
      },
      tags: [],
      created_at: '2024-09-04T06:44:17.944Z',
      updated_at: '2025-08-04T06:44:19.123Z',
    });
  });
});

describe('createAttributes', () => {
  it('converts the creation request to attributes', () => {
    const actualCreationDate = new Date();
    const createRequest: ToolCreateParams = {
      id: 'id',
      type: ToolType.esql,
      description: 'foo',
      configuration: {
        hello: 'world',
      },
    };

    const properties = createAttributes({
      createRequest,
      space: 'some-space',
      creationDate: actualCreationDate,
    });

    expect(properties).toEqual({
      id: 'id',
      type: ToolType.esql,
      space: 'some-space',
      description: 'foo',
      configuration: {
        hello: 'world',
      },
      tags: [],
      created_at: actualCreationDate.toISOString(),
      updated_at: actualCreationDate.toISOString(),
    });
  });
});

describe('updateDocument', () => {
  it('merges the existing and update attributes', () => {
    const actualUpdateDate = new Date();

    const currentProps: ToolProperties = {
      id: 'id',
      type: ToolType.esql,
      space: 'some-space',
      description: 'foo',
      configuration: {
        hello: 'world',
        foo: 'bar',
      },
      tags: [],
      created_at: creationDate,
      updated_at: updateDate,
    };

    const update: ToolTypeUpdateParams = {
      description: 'new desc',
      configuration: {
        hello: 'dolly',
        anotherProp: 'foo',
      },
    };

    const merged = updateDocument({
      current: currentProps,
      update,
      updateDate: actualUpdateDate,
    });

    expect(merged).toEqual({
      id: 'id',
      type: ToolType.esql,
      space: 'some-space',
      description: 'new desc',
      configuration: {
        anotherProp: 'foo',
        foo: 'bar',
        hello: 'dolly',
      },
      tags: [],
      created_at: creationDate,
      updated_at: actualUpdateDate.toISOString(),
    });
  });
});
