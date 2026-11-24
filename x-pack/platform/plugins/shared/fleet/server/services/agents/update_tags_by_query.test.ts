/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkIndexByScrollFailure } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { FleetError, UpdateByQueryIncompleteError } from '../../errors';

import type { UpdateByQueryTaskResponse } from './update_by_query_task';
import { updateByQueryAndWait } from './update_by_query_task';
import {
  UPDATE_BY_QUERY_CHUNK_SIZE,
  buildUpdateTagsRequest,
  updateAgentsTags,
} from './update_tags_by_query';

jest.mock('./update_by_query_task');
jest.mock('../app_context', () => {
  const { loggerMock } = jest.requireActual('@kbn/logging-mocks');
  const logger = loggerMock.create();
  return { appContextService: { getLogger: () => logger } };
});

const idsOf = (agentCount: number, from = 0) =>
  Array.from({ length: agentCount }, (_, index) => `agent${from + index}`);

/** The result of an update that went through all of its agents. */
const wentThrough = (
  agentCount: number,
  more: Partial<UpdateByQueryTaskResponse> = {}
): UpdateByQueryTaskResponse => ({
  took: 10,
  total: agentCount,
  updated: agentCount,
  version_conflicts: 0,
  failures: [],
  ...more,
});

/** A failure of the update of an agent, as Elasticsearch reports it. */
const failure = (id: string, reason: string): BulkIndexByScrollFailure => ({
  id,
  cause: { type: 'mapper_parsing_exception', reason },
  index: '.fleet-agents',
  status: 400,
});

const CANCELLED: UpdateByQueryTaskResponse = { canceled: 'by user request', total: 5, updated: 3 };
const TIMED_OUT: UpdateByQueryTaskResponse = { timed_out: true, total: 0, updated: 0 };

describe('buildUpdateTagsRequest', () => {
  const tags = { tagsToAdd: ['new', 'new'], tagsToRemove: ['old'], updatedAt: '2026-11-23' };

  it('should select the agents by id', () => {
    const request = buildUpdateTagsRequest(['agent1', 'agent2'], tags);

    expect(request).toEqual(
      expect.objectContaining({
        index: '.fleet-agents',
        query: { terms: { _id: ['agent1', 'agent2'] } },
        refresh: true,
        conflicts: 'proceed',
      })
    );
  });

  it('should leave out the agents that are not in the space', () => {
    const namespaceQuery = { term: { namespaces: 'myspace' } };

    const request = buildUpdateTagsRequest(['agent1'], { ...tags, namespaceQuery });

    expect(request.query).toEqual({
      bool: { filter: [{ terms: { _id: ['agent1'] } }, namespaceQuery] },
    });
  });

  it('should give the script each tag once, and the time of the update', () => {
    const request = buildUpdateTagsRequest(['agent1'], tags);

    expect(request.script).toEqual(
      expect.objectContaining({
        lang: 'painless',
        params: { tagsToAdd: ['new'], tagsToRemove: ['old'], updatedAt: '2026-11-23' },
      })
    );
  });
});

describe('updateAgentsTags', () => {
  let esClient: ElasticsearchClientMock;

  const requestFor = (ids: string[]) =>
    buildUpdateTagsRequest(ids, { tagsToAdd: ['new'], tagsToRemove: [], updatedAt: 'now' });
  const update = (agentIds: string[], retriedByAction = true) =>
    updateAgentsTags(esClient, agentIds, { requestFor, actionId: 'action1', retriedByAction });
  /** The ids that each run of the update was for. */
  const idsOfRuns = () =>
    jest
      .mocked(updateByQueryAndWait)
      .mock.calls.map(([, request]) => (request.query as { terms: { _id: string[] } }).terms._id);

  beforeEach(() => {
    jest.resetAllMocks();
    esClient = elasticsearchServiceMock.createInternalClient();
  });

  describe('an update that went through all of its agents', () => {
    it('should be the result, from one update of all the agents', async () => {
      jest.mocked(updateByQueryAndWait).mockResolvedValue(wentThrough(3));

      const outcome = await update(idsOf(3));

      expect(outcome).toEqual({ response: wentThrough(3), agentsCovered: 3 });
      expect(idsOfRuns()).toEqual([idsOf(3)]);
    });

    it('should cover an agent once, however many times its id is given', async () => {
      jest.mocked(updateByQueryAndWait).mockResolvedValue(wentThrough(2));

      const outcome = await update(['agent1', 'agent1', 'agent2']);

      expect(outcome.agentsCovered).toEqual(2);
    });
  });

  describe.each([
    ['cancelled', CANCELLED],
    ['timed out', TIMED_OUT],
  ])('an update that %s', (_, incomplete) => {
    it('should be run again, a chunk at a time, for the same agents', async () => {
      jest
        .mocked(updateByQueryAndWait)
        .mockResolvedValueOnce(incomplete)
        .mockResolvedValueOnce(wentThrough(UPDATE_BY_QUERY_CHUNK_SIZE))
        .mockResolvedValueOnce(wentThrough(UPDATE_BY_QUERY_CHUNK_SIZE))
        .mockResolvedValueOnce(wentThrough(500));

      const outcome = await update(idsOf(2500));

      // the whole batch, and then the chunks of it, in order and none twice
      expect(idsOfRuns().map((ids) => ids.length)).toEqual([2500, 1000, 1000, 500]);
      expect(idsOfRuns().slice(1).flat()).toEqual(idsOf(2500));
      expect(outcome).toEqual({
        response: expect.objectContaining({ total: 2500, updated: 2500, took: 30 }),
        agentsCovered: 2500,
      });
      expect(outcome.stoppedBy).toBeUndefined();
    });
  });

  describe('the chunks of an update that was too slow', () => {
    beforeEach(() => {
      jest.mocked(updateByQueryAndWait).mockResolvedValueOnce(CANCELLED);
    });

    it('should be combined, with their failures and version conflicts', async () => {
      const failures = [failure('agent3', 'first'), failure('agent2400', 'last')];
      jest
        .mocked(updateByQueryAndWait)
        .mockResolvedValueOnce(wentThrough(1000, { updated: 999, failures: [failures[0]] }))
        .mockResolvedValueOnce(wentThrough(1000, { updated: 998, version_conflicts: 2 }))
        .mockResolvedValueOnce(wentThrough(500, { updated: 499, failures: [failures[1]] }));

      const { response } = await update(idsOf(2500));

      expect(response).toEqual(
        expect.objectContaining({
          total: 2500,
          updated: 2496,
          version_conflicts: 2,
          failures,
        })
      );
    });

    it('should leave the total unknown when a chunk does not have one', async () => {
      jest
        .mocked(updateByQueryAndWait)
        .mockResolvedValueOnce(wentThrough(1000, { total: undefined }))
        .mockResolvedValueOnce(wentThrough(500));

      const { response } = await update(idsOf(1500));

      expect(response.total).toBeUndefined();
      expect(response.updated).toEqual(1500);
    });

    it('should be of the distinct agents, in the chunks, and of every id in the update of the batch', async () => {
      jest.mocked(updateByQueryAndWait).mockResolvedValueOnce(wentThrough(2));

      const outcome = await update(['agent1', 'agent1', 'agent2']);

      expect(idsOfRuns()).toEqual([
        ['agent1', 'agent1', 'agent2'],
        ['agent1', 'agent2'],
      ]);
      expect(outcome.agentsCovered).toEqual(2);
    });
  });

  describe('a chunk that is incomplete too', () => {
    beforeEach(() => {
      // the whole batch, and the chunks after it: the 2nd of them is cancelled
      jest
        .mocked(updateByQueryAndWait)
        .mockResolvedValueOnce(CANCELLED)
        .mockResolvedValueOnce(wentThrough(1000))
        .mockResolvedValueOnce({
          ...CANCELLED,
          failures: [failure('agent1500', 'in the cancelled chunk')],
        });
    });

    it('should keep what the chunks before it did, for the caller to record', async () => {
      const outcome = await update(idsOf(2500));

      expect(idsOfRuns().map((ids) => ids.length)).toEqual([2500, 1000, 1000]);
      expect(outcome.response).toEqual(expect.objectContaining({ total: 1000, updated: 1000 }));
      expect(outcome.agentsCovered).toEqual(1000);
      expect(outcome.stoppedBy).toBeInstanceOf(UpdateByQueryIncompleteError);
      expect(outcome.stoppedBy?.message).toMatch(
        /cancelled .* after updating 3 of 5 agents, giving up after running it again in chunks/
      );
    });

    it('should not take its failures for the result, as the retry of the action runs them again', async () => {
      const { response } = await update(idsOf(2500));

      expect(response.failures).toEqual([]);
    });

    it('should fail when the agents are given by id, as there is no action to retry', async () => {
      await expect(update(idsOf(2500), false)).rejects.toBeInstanceOf(UpdateByQueryIncompleteError);
    });
  });

  it('should fail when the first chunk is incomplete, as there is nothing to keep', async () => {
    jest
      .mocked(updateByQueryAndWait)
      .mockResolvedValueOnce(CANCELLED)
      .mockResolvedValueOnce(TIMED_OUT);

    const error = await update(idsOf(2500)).catch((e) => e);

    expect(error).toBeInstanceOf(UpdateByQueryIncompleteError);
    expect(error.message).toMatch(/timed out after updating 0 agents, giving up/);
    expect(idsOfRuns().map((ids) => ids.length)).toEqual([2500, 1000]);
  });

  describe('an error of the update', () => {
    it('should keep the message of a Fleet error, which JSON would drop', async () => {
      jest.mocked(updateByQueryAndWait).mockRejectedValue(new FleetError('the task failed'));

      await expect(update(idsOf(1))).rejects.toThrow(
        'Caught error while batch updating tags: the task failed'
      );
    });

    it('should be reported as JSON, and cut at 1000 characters', async () => {
      jest
        .mocked(updateByQueryAndWait)
        .mockRejectedValue({ name: 'TimeoutError', message: 'x'.repeat(2000) });

      const error = await update(idsOf(1)).catch((e) => e);

      expect(error).toBeInstanceOf(FleetError);
      expect(error.message).toMatch(
        /^Caught error while batch updating tags: \{"name":"TimeoutError"/
      );
      expect(error.message.length).toEqual(
        'Caught error while batch updating tags: '.length + 1000
      );
    });
  });
});
