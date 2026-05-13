/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentBuilderErrorCode,
  ConversationRoundStatus,
  isAgentBuilderError,
} from '@kbn/agent-builder-common';
import { ConversationClientImpl } from './client';
import type { ConversationStorage } from './storage';

interface MockStorageClient {
  search: jest.Mock;
  index: jest.Mock;
  delete: jest.Mock;
  get: jest.Mock;
  bulk: jest.Mock;
  clean: jest.Mock;
  existsIndex: jest.Mock;
}

const buildMockStorage = (): {
  storage: ConversationStorage;
  client: MockStorageClient;
} => {
  const client: MockStorageClient = {
    search: jest.fn(),
    index: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    bulk: jest.fn(),
    clean: jest.fn(),
    existsIndex: jest.fn(),
  };
  const storage = { getClient: () => client } as unknown as ConversationStorage;
  return { storage, client };
};

const SPACE = 'default';
const USER = { id: 'user-1', username: 'alice' };

const makeStoredDocument = ({
  id,
  rounds = [],
  userName = USER.username,
  userId = USER.id,
}: {
  id: string;
  rounds?: any[];
  userName?: string;
  userId?: string;
}) => ({
  _id: id,
  _source: {
    agent_id: 'agent-1',
    title: 'Title',
    user_id: userId,
    user_name: userName,
    space: SPACE,
    conversation_rounds: rounds,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
});

const makeSearchResponse = (hits: any[]) => ({
  hits: {
    hits,
    total: { value: hits.length, relation: 'eq' },
  },
});

const makeCountResponse = (total: number) => ({
  hits: {
    hits: [],
    total: { value: total, relation: 'eq' },
  },
});

describe('ConversationClientImpl.import', () => {
  let storage: ConversationStorage;
  let client: MockStorageClient;
  let impl: ConversationClientImpl;

  beforeEach(() => {
    ({ storage, client } = buildMockStorage());
    impl = new ConversationClientImpl({ storage, user: USER, space: SPACE });
  });

  it('creates a new conversation with rounds when no id is provided', async () => {
    // 1st search call: from create() -> get() -> _get() to read the inserted doc.
    client.index.mockResolvedValue({ _id: 'generated' });
    client.search.mockImplementation(({ size }: any) => {
      // _get(id) issues size=1 search; return the freshly indexed document.
      if (size === 1) {
        return Promise.resolve(
          makeSearchResponse([
            makeStoredDocument({
              id: 'generated',
              rounds: [
                {
                  id: 'r1',
                  status: ConversationRoundStatus.completed,
                  input: { message: 'hello' },
                  response: { message: 'world' },
                  steps: [],
                  started_at: '2024-01-01T00:00:00.000Z',
                  time_to_first_token: 0,
                  time_to_last_token: 0,
                  model_usage: {
                    connector_id: 'imported',
                    llm_calls: 0,
                    input_tokens: 0,
                    output_tokens: 0,
                  },
                },
              ],
            }),
          ])
        );
      }
      return Promise.resolve(makeSearchResponse([]));
    });

    const result = await impl.import({
      agent_id: 'agent-1',
      rounds: [{ user_message: 'hello', assistant_message: 'world' }],
    });

    expect(client.index).toHaveBeenCalledTimes(1);
    const indexCall = client.index.mock.calls[0][0];
    expect(indexCall.id).toEqual(expect.any(String));
    expect(indexCall.document.user_name).toEqual('alice');
    expect(indexCall.document.user_id).toEqual('user-1');
    expect(indexCall.document.agent_id).toEqual('agent-1');
    expect(indexCall.document.space).toEqual(SPACE);
    expect(indexCall.document.conversation_rounds).toHaveLength(1);
    const round = indexCall.document.conversation_rounds[0];
    expect(round.input.message).toEqual('hello');
    expect(round.response.message).toEqual('world');
    expect(round.steps).toEqual([]);
    expect(round.status).toEqual(ConversationRoundStatus.completed);

    expect(result.id).toEqual('generated');
    expect(result.rounds).toHaveLength(1);
  });

  it('uses the provided id and title', async () => {
    client.index.mockResolvedValue({ _id: 'fixed-id' });
    // First search: _get pre-check (no existing doc).
    // Second search: _get after create.
    client.search.mockResolvedValueOnce(makeSearchResponse([])).mockResolvedValueOnce(
      makeSearchResponse([
        makeStoredDocument({
          id: 'fixed-id',
          rounds: [
            {
              id: 'r1',
              status: ConversationRoundStatus.completed,
              input: { message: 'q' },
              response: { message: 'a' },
              steps: [],
              started_at: '2024-01-01T00:00:00.000Z',
              time_to_first_token: 0,
              time_to_last_token: 0,
              model_usage: {
                connector_id: 'imported',
                llm_calls: 0,
                input_tokens: 0,
                output_tokens: 0,
              },
            },
          ],
        }),
      ])
    );

    await impl.import({
      agent_id: 'agent-1',
      id: 'fixed-id',
      title: '  My eval title  ',
      rounds: [{ user_message: 'q', assistant_message: 'a' }],
    });

    expect(client.index).toHaveBeenCalledTimes(1);
    const indexCall = client.index.mock.calls[0][0];
    expect(indexCall.id).toEqual('fixed-id');
    expect(indexCall.document.title).toEqual('My eval title');
  });

  it('respects caller-provided started_at on each round', async () => {
    client.index.mockResolvedValue({ _id: 'id-1' });
    client.search
      .mockResolvedValueOnce(makeSearchResponse([])) // no existing
      .mockResolvedValueOnce(makeSearchResponse([makeStoredDocument({ id: 'id-1', rounds: [] })]));

    await impl.import({
      agent_id: 'agent-1',
      id: 'id-1',
      rounds: [
        {
          user_message: 'q1',
          assistant_message: 'a1',
          started_at: '2024-06-01T10:00:00.000Z',
        },
        {
          user_message: 'q2',
          assistant_message: 'a2',
          started_at: '2024-06-01T10:01:00.000Z',
        },
      ],
    });

    const doc = client.index.mock.calls[0][0].document;
    expect(doc.conversation_rounds[0].started_at).toEqual('2024-06-01T10:00:00.000Z');
    expect(doc.conversation_rounds[1].started_at).toEqual('2024-06-01T10:01:00.000Z');
  });

  it('throws 409 (badRequest with statusCode 409) when id exists and mode=create', async () => {
    client.search.mockResolvedValueOnce(
      makeSearchResponse([makeStoredDocument({ id: 'fixed-id' })])
    );

    let caught: any;
    try {
      await impl.import({
        agent_id: 'agent-1',
        id: 'fixed-id',
        rounds: [{ user_message: 'a', assistant_message: 'b' }],
      });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeDefined();
    expect(isAgentBuilderError(caught)).toBe(true);
    expect(caught.code).toEqual(AgentBuilderErrorCode.badRequest);
    expect(caught.meta.statusCode).toEqual(409);
    expect(client.index).not.toHaveBeenCalled();
  });

  it('overwrites existing conversation when mode=overwrite and current user owns it', async () => {
    client.search
      .mockResolvedValueOnce(
        // Pre-check: doc exists, owned by current user.
        makeSearchResponse([makeStoredDocument({ id: 'fixed-id' })])
      )
      .mockResolvedValueOnce(
        // Post-write: return the new doc.
        makeSearchResponse([
          makeStoredDocument({
            id: 'fixed-id',
            rounds: [],
          }),
        ])
      );
    client.index.mockResolvedValue({ _id: 'fixed-id' });

    await impl.import({
      agent_id: 'agent-1',
      id: 'fixed-id',
      mode: 'overwrite',
      rounds: [{ user_message: 'a', assistant_message: 'b' }],
    });

    expect(client.index).toHaveBeenCalledTimes(1);
  });

  it('throws 403 when id exists in space but is owned by a different user (any mode)', async () => {
    client.search.mockResolvedValueOnce(
      makeSearchResponse([
        makeStoredDocument({
          id: 'fixed-id',
          userId: 'someone-else-id',
          userName: 'bob',
        }),
      ])
    );

    let caught: any;
    try {
      await impl.import({
        agent_id: 'agent-1',
        id: 'fixed-id',
        mode: 'overwrite',
        rounds: [{ user_message: 'a', assistant_message: 'b' }],
      });
    } catch (e) {
      caught = e;
    }

    expect(isAgentBuilderError(caught)).toBe(true);
    expect(caught.meta.statusCode).toEqual(403);
    expect(client.index).not.toHaveBeenCalled();
  });

  it.each([
    [{ rounds: [] }, 'At least one round is required'],
    [
      { rounds: [{ user_message: '', assistant_message: 'a' }] },
      'rounds[0].user_message must be a non-empty string.',
    ],
    [
      { rounds: [{ user_message: 'a', assistant_message: '' }] },
      'rounds[0].assistant_message must be a non-empty string.',
    ],
    [
      {
        rounds: [{ user_message: 'a', assistant_message: 'b', started_at: 'not-a-date' }],
      },
      'rounds[0].started_at is not a valid ISO timestamp.',
    ],
  ])('rejects invalid request: %o', async (badRoundsObj, expectedMessage) => {
    await expect(
      impl.import({ agent_id: 'agent-1', rounds: badRoundsObj.rounds as any })
    ).rejects.toThrow(expectedMessage);

    expect(client.index).not.toHaveBeenCalled();
  });

  it('rejects when rounds exceed IMPORT_MAX_ROUNDS', async () => {
    const tooMany = Array.from({ length: 1001 }, (_, i) => ({
      user_message: `q${i}`,
      assistant_message: `a${i}`,
    }));
    await expect(impl.import({ agent_id: 'agent-1', rounds: tooMany })).rejects.toThrow(
      /Too many rounds/
    );
    expect(client.index).not.toHaveBeenCalled();
  });
});

describe('ConversationClientImpl.bulkDelete', () => {
  let storage: ConversationStorage;
  let client: MockStorageClient;
  let impl: ConversationClientImpl;

  beforeEach(() => {
    ({ storage, client } = buildMockStorage());
    impl = new ConversationClientImpl({ storage, user: USER, space: SPACE });
  });

  it('rejects when no filters are provided', async () => {
    await expect(impl.bulkDelete({})).rejects.toThrow(/at least one of/);
  });

  it('rejects when conversation_ids exceeds the limit', async () => {
    const ids = Array.from({ length: 1001 }, (_, i) => `c${i}`);
    await expect(impl.bulkDelete({ conversation_ids: ids })).rejects.toThrow(/exceeds maximum/);
  });

  it('rejects invalid timestamps', async () => {
    await expect(impl.bulkDelete({ created_after: 'invalid' })).rejects.toThrow(/created_after/);
    await expect(impl.bulkDelete({ created_before: 'invalid' })).rejects.toThrow(/created_before/);
  });

  it('returns matched count and skips deletes when dry_run is true', async () => {
    client.search
      .mockResolvedValueOnce(makeCountResponse(5))
      .mockResolvedValueOnce(makeSearchResponse([{ _id: 'c1' }, { _id: 'c2' }, { _id: 'c3' }]));

    const result = await impl.bulkDelete({
      conversation_ids: ['c1', 'c2', 'c3', 'not-mine'],
      dry_run: true,
    });

    expect(result).toEqual({
      deleted: 0,
      matched: 5,
      not_found: ['not-mine'],
    });
    expect(client.delete).not.toHaveBeenCalled();
  });

  it('deletes matching conversations and counts the deletes', async () => {
    client.search
      // count
      .mockResolvedValueOnce(makeCountResponse(2))
      // page 1 (full page of 2 results)
      .mockResolvedValueOnce(makeSearchResponse([{ _id: 'c1' }, { _id: 'c2' }]));
    client.delete.mockResolvedValue({ result: 'deleted' });

    const result = await impl.bulkDelete({ agent_id: 'agent-1' });

    expect(client.delete).toHaveBeenCalledTimes(2);
    expect(client.delete.mock.calls.map((c) => c[0].id).sort()).toEqual(['c1', 'c2']);
    expect(result.deleted).toEqual(2);
    expect(result.matched).toEqual(2);
    expect(result.not_found).toEqual([]);
  });

  it('scopes filters by space and current user', async () => {
    client.search.mockResolvedValue(makeCountResponse(0));

    await impl.bulkDelete({ agent_id: 'agent-1', dry_run: true });

    const countCall = client.search.mock.calls[0][0];
    const filters = countCall.query.bool.filter as Array<Record<string, any>>;
    // Filter must include a user_name term scoping to current user.
    const userFilter = filters.find((f) => f.term && f.term.user_name === 'alice');
    expect(userFilter).toBeDefined();
    // Filter must include an agent_id term.
    const agentFilter = filters.find((f) => f.term && f.term.agent_id === 'agent-1');
    expect(agentFilter).toBeDefined();
  });

  it('supports time-range filters', async () => {
    client.search.mockResolvedValue(makeCountResponse(0));

    await impl.bulkDelete({
      created_after: '2024-01-01T00:00:00.000Z',
      created_before: '2024-12-31T00:00:00.000Z',
      dry_run: true,
    });

    const filters = client.search.mock.calls[0][0].query.bool.filter as Array<Record<string, any>>;
    const rangeFilter = filters.find((f) => f.range && f.range.created_at);
    expect(rangeFilter).toBeDefined();
    expect(rangeFilter!.range.created_at).toEqual({
      gte: '2024-01-01T00:00:00.000Z',
      lte: '2024-12-31T00:00:00.000Z',
    });
  });

  it('breaks the delete loop if a page returns zero hits', async () => {
    client.search
      .mockResolvedValueOnce(makeCountResponse(3))
      // The actual page comes back empty (e.g. concurrent cleanup).
      .mockResolvedValueOnce(makeSearchResponse([]));

    const result = await impl.bulkDelete({ agent_id: 'agent-1' });

    expect(client.delete).not.toHaveBeenCalled();
    expect(result).toEqual({ deleted: 0, matched: 3, not_found: [] });
  });
});
