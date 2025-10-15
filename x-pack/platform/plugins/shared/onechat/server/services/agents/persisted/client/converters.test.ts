/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentType } from '@kbn/onechat-common';
import type { AgentCreateRequest, AgentUpdateRequest } from '../../../../../common/agents';
import type { AgentProperties } from './storage';
import type { Document } from './converters';
import { createRequestToEs, fromEs, updateRequestToEs } from './converters';

const creationDate = '2024-09-04T06:44:17.944Z';
const updateDate = '2025-08-04T06:44:19.123Z';

describe('fromEs', () => {
  const getSampleDoc = (): Document => {
    return {
      _id: '_id',
      _source: {
        id: 'id',
        name: 'name',
        type: AgentType.chat,
        space: 'space',
        description: 'description',
        labels: ['foo', 'bar'],
        configuration: {
          instructions: 'instructions',
          tools: [{ tool_ids: ['id_1', 'id_2'] }],
        },
        created_at: creationDate,
        updated_at: updateDate,
      },
    };
  };

  it('converts an agent document to its definition', () => {
    const document = getSampleDoc();

    const definition = fromEs(document);

    expect(definition).toEqual({
      type: AgentType.chat,
      id: 'id',
      name: 'name',
      configuration: {
        instructions: 'instructions',
        tools: [
          {
            tool_ids: ['id_1', 'id_2'],
          },
        ],
      },
      description: 'description',
      labels: ['foo', 'bar'],
    });
  });

  it('handles legacy doc format', () => {
    const document = getSampleDoc();
    document._id = '_id';
    // @ts-ignore testing edge case
    document._source!.id = undefined;

    const definition = fromEs(document);

    expect(definition.id).toEqual('_id');
  });
});

describe('createRequestToEs', () => {
  it('converts a request to the document format', () => {
    const createRequest: AgentCreateRequest = {
      id: 'id',
      name: 'name',
      description: 'description',
      configuration: {
        instructions: 'instructions',
        tools: [
          {
            tool_ids: ['id_1', 'id_2'],
          },
        ],
      },
      labels: ['foo', 'bar'],
    };

    const date = new Date();

    const docProperties = createRequestToEs({
      profile: createRequest,
      space: 'space-2',
      creationDate: date,
    });

    expect(docProperties).toEqual({
      type: AgentType.chat,
      id: 'id',
      name: 'name',
      space: 'space-2',
      description: 'description',
      configuration: {
        instructions: 'instructions',
        tools: [
          {
            tool_ids: ['id_1', 'id_2'],
          },
        ],
      },
      labels: ['foo', 'bar'],
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });
  });
});

describe('updateRequestToEs', () => {
  it('converts an update request to the document format', () => {
    const newUpdateDate = new Date();

    const agentProps: AgentProperties = {
      id: 'id',
      type: AgentType.chat,
      name: 'name',
      description: 'description',
      space: 'space',
      configuration: {
        instructions: 'instructions',
        tools: [
          {
            tool_ids: ['id_1', 'id_2'],
          },
        ],
      },
      labels: ['foo', 'bar'],
      created_at: creationDate,
      updated_at: updateDate,
    };

    const updateRequest: AgentUpdateRequest = {
      name: 'new name',
      configuration: {
        tools: [{ tool_ids: ['new_id_1', 'new_id_2'] }],
      },
    };

    const docProperties = updateRequestToEs({
      agentId: 'id',
      currentProps: agentProps,
      update: updateRequest,
      updateDate: newUpdateDate,
    });

    expect(docProperties).toEqual({
      id: 'id',
      type: AgentType.chat,
      space: 'space',
      name: 'new name',
      description: 'description',
      configuration: {
        instructions: 'instructions',
        tools: [
          {
            tool_ids: ['new_id_1', 'new_id_2'],
          },
        ],
      },
      labels: ['foo', 'bar'],
      created_at: creationDate,
      updated_at: newUpdateDate.toISOString(),
    });
  });
});
