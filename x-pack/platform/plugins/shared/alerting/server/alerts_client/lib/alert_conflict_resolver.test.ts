/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  ALERT_CASE_IDS,
  ALERT_INSTANCE_ID,
  ALERT_STATUS,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  EVENT_ACTION,
} from '@kbn/rule-data-utils';
import type {
  BulkRequest,
  BulkResponse,
  BulkResponseItem,
  BulkOperationType,
} from '@elastic/elasticsearch/lib/api/types';

import { resolveAlertConflicts } from './alert_conflict_resolver';

const logger = loggingSystemMock.create().get();
const esClient = elasticsearchServiceMock.createElasticsearchClient();
const ruleId = 'rule-id';
const ruleName = 'name of rule';
const ruleType = 'rule-type';

const ruleInfo = `for ${ruleType}:${ruleId} '${ruleName}'`;
const logTags = { tags: [ruleType, ruleId, 'resolve-alert-conflicts'] };

const alertDoc = {
  [EVENT_ACTION]: 'active',
  [ALERT_STATUS]: 'untracked',
  [ALERT_WORKFLOW_STATUS]: 'a-ok!',
  [ALERT_WORKFLOW_TAGS]: ['fee', 'fi', 'fo', 'fum'],
  [ALERT_CASE_IDS]: ['123', '456', '789'],
  [ALERT_UUID]: 'alert-uuid-from-doc',
  [ALERT_INSTANCE_ID]: 'instance-from-doc',
};

const noUnresolvedErrors = { unresolvedCount: 0, permanentCount: 0, unresolvedErrorTypes: {} };

describe('alert_conflict_resolver', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('throws errors', () => {
    test('when mget fails', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('ic');

      esClient.mget.mockRejectedValueOnce(new Error('mget failed'));

      await expect(
        resolveAlertConflicts({
          logger,
          esClient,
          bulkRequest,
          bulkResponse,
          ruleId,
          ruleName,
          ruleType,
        })
      ).rejects.toThrowError('mget failed');
    });

    test('when bulk fails', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('ic');

      esClient.mget.mockResolvedValueOnce({
        docs: [getMGetResDoc(0, alertDoc)],
      });
      esClient.bulk.mockRejectedValueOnce(new Error('bulk failed'));

      await expect(
        resolveAlertConflicts({
          logger,
          esClient,
          bulkRequest,
          bulkResponse,
          ruleId,
          ruleName,
          ruleType,
        })
      ).rejects.toThrowError('bulk failed');
    });

    test('when the retried bulk response has an unexpected number of items', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('ir ir');

      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 0,
        items: [getBulkResItem(1)],
      });

      await expect(
        resolveAlertConflicts({
          logger,
          esClient,
          bulkRequest,
          bulkResponse,
          ruleId,
          ruleName,
          ruleType,
        })
      ).rejects.toThrowError(
        'Unexpected number of bulk response items retried; expecting 2, retried 1'
      );
    });
  });

  describe('is successful with', () => {
    test('no bulk results', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('');
      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });
      expect(result).toEqual(noUnresolvedErrors);
      expect(logger.error).not.toHaveBeenCalled();
    });

    test('no errors in bulk results', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('c is is c is d');
      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });
      expect(result).toEqual(noUnresolvedErrors);
      expect(logger.error).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    test('one conflicted doc', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('ic');

      esClient.mget.mockResolvedValueOnce({
        docs: [getMGetResDoc(0, alertDoc)],
      });

      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 0,
        items: [getBulkResItem(0)],
      });

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual(noUnresolvedErrors);
      expect(logger.error).toHaveBeenNthCalledWith(
        1,
        `Error writing alerts ${ruleInfo}: 0 successful, 1 conflicts, 0 errors: `,
        logTags
      );
      expect(logger.warn).toHaveBeenNthCalledWith(
        1,
        `Alert bulk write conflict ${ruleInfo}: alert UUID 'id-1', instance ID 'instance-from-doc'`,
        logTags
      );
      expect(logger.info).toHaveBeenNthCalledWith(
        1,
        `Retrying bulk update of 1 alerts (retry 1 of 3): 1 conflicts, 0 retryable errors ${ruleInfo}`,
        logTags
      );
      expect(logger.info).toHaveBeenNthCalledWith(
        2,
        `Retried bulk update of 1 alerts succeeded ${ruleInfo}`,
        logTags
      );
      expect(Math.random).not.toHaveBeenCalled();
    });

    test('one conflicted doc amonst other successes and errors', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('is c ic ie');

      esClient.mget.mockResolvedValueOnce({
        docs: [getMGetResDoc(2, alertDoc)],
      });

      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 0,
        items: [getBulkResItem(2)],
      });

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual({ ...noUnresolvedErrors, permanentCount: 1 });
      expect(logger.error).toHaveBeenNthCalledWith(
        1,
        `Error writing alerts ${ruleInfo}: 2 successful, 1 conflicts, 1 errors: hallo`,
        logTags
      );
      expect(logger.warn).toHaveBeenNthCalledWith(
        1,
        `Alert bulk write conflict ${ruleInfo}: alert UUID 'id-3', instance ID 'instance-from-doc'`,
        logTags
      );
      expect(logger.info).toHaveBeenNthCalledWith(
        1,
        `Retrying bulk update of 1 alerts (retry 1 of 3): 1 conflicts, 0 retryable errors ${ruleInfo}`,
        logTags
      );
      expect(logger.info).toHaveBeenNthCalledWith(
        2,
        `Retried bulk update of 1 alerts succeeded ${ruleInfo}`,
        logTags
      );
    });

    test('multiple conflicted doc amonst other successes and errors', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('is c ic ic ie ic');

      esClient.mget.mockResolvedValueOnce({
        docs: [getMGetResDoc(2, alertDoc), getMGetResDoc(3, alertDoc), getMGetResDoc(5, alertDoc)],
      });

      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 0,
        items: [getBulkResItem(2), getBulkResItem(3), getBulkResItem(5)],
      });

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual({ ...noUnresolvedErrors, permanentCount: 1 });
      expect(logger.error).toHaveBeenNthCalledWith(
        1,
        `Error writing alerts ${ruleInfo}: 2 successful, 3 conflicts, 1 errors: hallo`,
        logTags
      );
      expect(logger.warn).toHaveBeenNthCalledWith(
        1,
        `Alert bulk write conflict ${ruleInfo}: alert UUID 'id-3', instance ID 'instance-from-doc'`,
        logTags
      );
      expect(logger.warn).toHaveBeenNthCalledWith(
        2,
        `Alert bulk write conflict ${ruleInfo}: alert UUID 'id-4', instance ID 'instance-from-doc'`,
        logTags
      );
      expect(logger.warn).toHaveBeenNthCalledWith(
        3,
        `Alert bulk write conflict ${ruleInfo}: alert UUID 'id-6', instance ID 'instance-from-doc'`,
        logTags
      );
      expect(logger.info).toHaveBeenNthCalledWith(
        1,
        `Retrying bulk update of 3 alerts (retry 1 of 3): 3 conflicts, 0 retryable errors ${ruleInfo}`,
        logTags
      );
      expect(logger.info).toHaveBeenNthCalledWith(
        2,
        `Retried bulk update of 3 alerts succeeded ${ruleInfo}`,
        logTags
      );
    });

    test('a conflicted doc alongside a delete op', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('d ic');

      esClient.mget.mockResolvedValueOnce({
        docs: [getMGetResDoc(2, alertDoc)],
      });

      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 0,
        items: [getBulkResItem(2)],
      });

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual(noUnresolvedErrors);
      expect(esClient.mget).toHaveBeenCalledWith(
        expect.objectContaining({ docs: [{ _id: 'id-2', _index: 'index-2' }] })
      );
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(esClient.bulk.mock.calls[0][0]).toEqual({
        refresh: 'wait_for',
        index: 'some-index',
        require_alias: true,
        operations: [
          {
            index: {
              _id: 'id-2',
              _index: 'index-2',
              if_seq_no: 18,
              if_primary_term: 1,
              require_alias: false,
            },
          },
          alertDoc,
        ],
      });
      expect(logger.info).toHaveBeenNthCalledWith(
        2,
        `Retried bulk update of 1 alerts succeeded ${ruleInfo}`,
        logTags
      );
    });

    test('retryable errors that succeed on retry', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('is ir iu ib cr');

      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 0,
        items: [
          getBulkResItem(2),
          getBulkResItem(3),
          getBulkResItem(4),
          getResponseItem('create', 5, false, 201),
        ],
      });

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual(noUnresolvedErrors);
      expect(esClient.mget).not.toHaveBeenCalled();
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(esClient.bulk.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          operations: [
            getIndexOp(2),
            alertDoc,
            getIndexOp(3),
            alertDoc,
            getIndexOp(4),
            alertDoc,
            { create: {} },
            alertDoc,
          ],
        })
      );
      expect(Math.random).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenNthCalledWith(
        1,
        `Error writing alerts ${ruleInfo}: 1 successful, 0 conflicts, 4 errors: hallo; hallo; hallo; hallo`,
        logTags
      );
      expect(logger.info).toHaveBeenNthCalledWith(
        1,
        `Retrying bulk update of 4 alerts (retry 1 of 3): 0 conflicts, 4 retryable errors ${ruleInfo}`,
        logTags
      );
      expect(logger.info).toHaveBeenNthCalledWith(
        2,
        `Retried bulk update of 4 alerts succeeded ${ruleInfo}`,
        logTags
      );
    });

    test('a retryable delete op', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('dr');

      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 0,
        items: [getResponseItem('delete', 1, false, 200)],
      });

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual(noUnresolvedErrors);
      expect(esClient.bulk.mock.calls[0][0]).toEqual(
        expect.objectContaining({ operations: [getDeleteOp(1)] })
      );
    });

    test('a conflict and a retryable error in the same retry', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('ic ir');

      esClient.mget.mockResolvedValueOnce({
        docs: [getMGetResDoc(1, alertDoc)],
      });

      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 0,
        items: [getBulkResItem(1), getBulkResItem(2)],
      });

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual(noUnresolvedErrors);
      expect(esClient.mget).toHaveBeenCalledWith(
        expect.objectContaining({ docs: [{ _id: 'id-1', _index: 'index-1' }] })
      );
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenNthCalledWith(
        1,
        `Retrying bulk update of 2 alerts (retry 1 of 3): 1 conflicts, 1 retryable errors ${ruleInfo}`,
        logTags
      );
    });

    test('a retry that only resolves some of the retryable errors', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('ir ir');

      esClient.bulk
        .mockResolvedValueOnce({
          errors: true,
          took: 0,
          items: [
            getBulkResItem(1),
            getResponseItem('index', 2, true, 429, 'es_rejected_execution_exception'),
          ],
        })
        .mockResolvedValueOnce({
          errors: false,
          took: 0,
          items: [getBulkResItem(2)],
        });

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual(noUnresolvedErrors);
      expect(esClient.bulk).toHaveBeenCalledTimes(2);
      expect(esClient.bulk.mock.calls[1][0]).toEqual(
        expect.objectContaining({ operations: [getIndexOp(2), alertDoc] })
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `Retried bulk update of 2 alerts still had 1 errors ${ruleInfo}: 1 es_rejected_execution_exception`,
        logTags
      );
      expect(logger.info).toHaveBeenCalledWith(
        `Retrying bulk update of 1 alerts (retry 2 of 3): 0 conflicts, 1 retryable errors ${ruleInfo}`,
        logTags
      );
      expect(logger.info).toHaveBeenCalledWith(
        `Retried bulk update of 1 alerts succeeded ${ruleInfo}`,
        logTags
      );
    });

    test('a create conflict, which means the alert was already written', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('cc is');

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual(noUnresolvedErrors);
      expect(esClient.mget).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        `Skipped creating 1 alerts that already exist ${ruleInfo}`,
        logTags
      );
    });

    test('errors that are not retried', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('ie is');

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual({ ...noUnresolvedErrors, permanentCount: 1 });
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    test('server errors and missing indices, which are not retried', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('ix in is');

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual({ ...noUnresolvedErrors, permanentCount: 2 });
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    test('a retry that fails with an error that is not retried', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('ir');

      esClient.bulk.mockResolvedValueOnce({
        errors: true,
        took: 0,
        items: [getResponseItem('index', 1, true, 400, 'mapper_parsing_exception')],
      });

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual({ ...noUnresolvedErrors, permanentCount: 1 });
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        `Retried bulk update of 1 alerts still had 1 errors ${ruleInfo}: 1 mapper_parsing_exception`,
        logTags
      );
    });
  });

  describe('reports unresolved errors', () => {
    test('when retryable errors still fail after all retries', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('ir is');

      esClient.bulk.mockResolvedValue({
        errors: true,
        took: 0,
        items: [getResponseItem('index', 1, true, 429, 'es_rejected_execution_exception')],
      });

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual({
        unresolvedCount: 1,
        permanentCount: 0,
        unresolvedErrorTypes: { es_rejected_execution_exception: 1 },
      });
      expect(esClient.bulk).toHaveBeenCalledTimes(3);
      expect(Math.random).toHaveBeenCalledTimes(3);
      expect(logger.info).toHaveBeenCalledWith(
        `Retrying bulk update of 1 alerts (retry 3 of 3): 0 conflicts, 1 retryable errors ${ruleInfo}`,
        logTags
      );
      expect(logger.error).toHaveBeenLastCalledWith(
        `Bulk update of 1 alerts still failed after 3 retries ${ruleInfo}: 1 es_rejected_execution_exception`,
        logTags
      );
    });

    test('when conflicts still fail after all retries', async () => {
      const { bulkRequest, bulkResponse } = getReqRes('ic');

      esClient.mget.mockResolvedValue({
        docs: [getMGetResDoc(1, alertDoc)],
      });
      esClient.bulk.mockResolvedValue({
        errors: true,
        took: 0,
        items: [getResponseItem('index', 1, true, 409, 'version_conflict_engine_exception')],
      });

      const result = await resolveAlertConflicts({
        logger,
        esClient,
        bulkRequest,
        bulkResponse,
        ruleId,
        ruleName,
        ruleType,
      });

      expect(result).toEqual({
        unresolvedCount: 1,
        permanentCount: 0,
        unresolvedErrorTypes: { version_conflict_engine_exception: 1 },
      });
      expect(esClient.mget).toHaveBeenCalledTimes(3);
      expect(esClient.bulk).toHaveBeenCalledTimes(3);
      expect(Math.random).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenLastCalledWith(
        `Bulk update of 1 alerts still failed after 3 retries ${ruleInfo}: 1 version_conflict_engine_exception`,
        logTags
      );
    });
  });
});

function getBulkResItem(id: number) {
  return {
    index: {
      _index: `index-${id}`,
      _id: `id-${id}`,
      _seq_no: 18,
      _primary_term: 1,
      status: 200,
    },
  };
}

function getMGetResDoc(id: number, doc: unknown) {
  return {
    _index: `index-${id}}`,
    _id: `id-${id}`,
    _seq_no: 18,
    _primary_term: 1,
    found: true,
    _source: doc,
  };
}

interface GetReqResResult {
  bulkRequest: BulkRequest<unknown, unknown>;
  bulkResponse: BulkResponse;
}

/**
 * takes as input a string of the tokens below and builds appropriate
 * bulk request and response objects to use in the tests:
 * - c: create with success
 * - cc: create with conflict
 * - cr: create with retryable error
 * - d: delete with success
 * - dr: delete with retryable error
 * - is: index with success
 * - ic: index with conflict
 * - ie: index with error that is not retried
 * - ix: index with server error that is not a circuit breaker (500)
 * - in: index with missing index (404)
 * - ir: index with retryable error (429)
 * - iu: index with retryable error (503)
 * - ib: index with retryable error (circuit breaker)
 */
function getReqRes(bulkOps: string): GetReqResResult {
  const ops = bulkOps.trim().split(/\s+/g);

  const bulkRequest = getBulkRequest();
  const bulkResponse = getBulkResponse();

  bulkRequest.operations = [];
  bulkResponse.items = [];
  bulkResponse.errors = false;

  if (ops[0] === '') return { bulkRequest, bulkResponse };

  const createOp = { create: {} };

  let id = 0;
  for (const op of ops) {
    id++;
    switch (op) {
      // create with success
      case 'c':
        bulkRequest.operations.push(createOp, alertDoc);
        bulkResponse.items.push(getResponseItem('create', id, false, 200));
        break;

      // create with conflict
      case 'cc':
        bulkResponse.errors = true;
        bulkRequest.operations.push(createOp, alertDoc);
        bulkResponse.items.push(
          getResponseItem('create', id, true, 409, 'version_conflict_engine_exception')
        );
        break;

      // create with retryable error
      case 'cr':
        bulkResponse.errors = true;
        bulkRequest.operations.push(createOp, alertDoc);
        bulkResponse.items.push(
          getResponseItem('create', id, true, 429, 'es_rejected_execution_exception')
        );
        break;

      // delete with success
      case 'd':
        bulkRequest.operations.push(getDeleteOp(id));
        bulkResponse.items.push(getResponseItem('delete', id, false, 200));
        break;

      // delete with retryable error
      case 'dr':
        bulkResponse.errors = true;
        bulkRequest.operations.push(getDeleteOp(id));
        bulkResponse.items.push(
          getResponseItem('delete', id, true, 429, 'es_rejected_execution_exception')
        );
        break;

      // index with success
      case 'is':
        bulkRequest.operations.push(getIndexOp(id), alertDoc);
        bulkResponse.items.push(getResponseItem('index', id, false, 200));
        break;

      // index with conflict
      case 'ic':
        bulkResponse.errors = true;
        bulkRequest.operations.push(getIndexOp(id), alertDoc);
        bulkResponse.items.push(
          getResponseItem('index', id, true, 409, 'version_conflict_engine_exception')
        );
        break;

      // index with error that is not retried
      case 'ie':
        bulkResponse.errors = true;
        bulkRequest.operations.push(getIndexOp(id), alertDoc);
        bulkResponse.items.push(getResponseItem('index', id, true, 418)); // I'm a teapot
        break;

      // index with server error that is not a circuit breaker
      case 'ix':
        bulkResponse.errors = true;
        bulkRequest.operations.push(getIndexOp(id), alertDoc);
        bulkResponse.items.push(getResponseItem('index', id, true, 500, 'illegal_state_exception'));
        break;

      // index with missing index
      case 'in':
        bulkResponse.errors = true;
        bulkRequest.operations.push(getIndexOp(id), alertDoc);
        bulkResponse.items.push(
          getResponseItem('index', id, true, 404, 'index_not_found_exception')
        );
        break;

      // index with retryable error (429)
      case 'ir':
        bulkResponse.errors = true;
        bulkRequest.operations.push(getIndexOp(id), alertDoc);
        bulkResponse.items.push(
          getResponseItem('index', id, true, 429, 'es_rejected_execution_exception')
        );
        break;

      // index with retryable error (503)
      case 'iu':
        bulkResponse.errors = true;
        bulkRequest.operations.push(getIndexOp(id), alertDoc);
        bulkResponse.items.push(
          getResponseItem('index', id, true, 503, 'unavailable_shards_exception')
        );
        break;

      // index with retryable error (circuit breaker), matched by error type
      case 'ib':
        bulkResponse.errors = true;
        bulkRequest.operations.push(getIndexOp(id), alertDoc);
        bulkResponse.items.push(
          getResponseItem('index', id, true, 500, 'circuit_breaking_exception')
        );
        break;

      // developer error
      default:
        throw new Error('bad input');
    }
  }

  return { bulkRequest, bulkResponse };
}

function getBulkRequest(): BulkRequest<unknown, unknown> {
  return {
    refresh: 'wait_for',
    index: 'some-index',
    require_alias: true,
    operations: [],
  };
}

function getIndexOp(id: number) {
  return {
    index: {
      _id: `id-${id}`,
      _index: `index-${id}`,
      if_seq_no: 17,
      if_primary_term: 1,
      require_alias: false,
    },
  };
}

function getDeleteOp(id: number) {
  return {
    delete: {
      _id: `id-${id}`,
      _index: `index-${id}`,
    },
  };
}

function getBulkResponse(): BulkResponse {
  return {
    errors: false,
    took: 0,
    items: [],
  };
}

function getResponseItem(
  type: BulkOperationType,
  id: number,
  error: boolean,
  status: number,
  errorType: string = 'illegal_argument_exception'
): Partial<Record<BulkOperationType, BulkResponseItem>> {
  if (error) {
    return {
      [type]: {
        _index: `index-${id}`,
        _id: `id-${id}`,
        error: { type: errorType, reason: 'hallo' },
        status,
      },
    };
  }

  return {
    [type]: {
      _index: `index-${id}`,
      _id: `id-${id}`,
      _seq_no: 18,
      _primary_term: 1,
      status: 200,
    },
  };
}
