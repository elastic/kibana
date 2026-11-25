/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ExecutionError } from '@kbn/workflows/server';
import { createWikiRegistry } from '../wiki/wiki_registry';
import { getRecallPageStepDefinition } from './recall_page_step';
import { getRecordEntryStepDefinition } from './record_entry_step';

const KEY = '885bd83c-f6da-4ddc-b65e-d61bdb80c4fa';
const logger = loggingSystemMock.createLogger();

const statusError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

const setup = () => {
  const registry = createWikiRegistry();
  registry.register({
    id: 'team-wiki',
    index: 'team-pages',
    pageTypes: { detection_rule: { entriesHeading: 'Decision history' } },
  });
  const esClient = {
    get: jest.fn().mockRejectedValue(statusError(404)),
    create: jest.fn().mockResolvedValue({}),
    index: jest.fn(),
  };
  const getScopedEsClient = jest.fn(() => esClient);
  const context = (input: unknown) =>
    ({
      input,
      abortSignal: new AbortController().signal,
      contextManager: {
        getScopedEsClient,
        getContext: () => ({ workflow: { spaceId: 'team-a' }, execution: { id: 'exec-1' } }),
      },
    } as unknown as StepHandlerContext);
  return { registry, esClient, getScopedEsClient, context };
};

const recallInput = { wiki_id: 'team-wiki', page_type: 'detection_rule', key: KEY };
const recordInput = {
  ...recallInput,
  title: 'Rule name',
  entry: { id: 'proposal-1', content: '### Proposal proposal-1\nDismissed' },
  conversation_id: 'conv-1',
};

describe('agentKnowledge.recallPage', () => {
  it("reads as the workflow's scoped identity and reports a missing page as not found", async () => {
    const { registry, esClient, getScopedEsClient, context } = setup();

    const result = await getRecallPageStepDefinition({ registry, logger }).handler(
      context(recallInput)
    );

    expect(result).toEqual({ output: { found: false } });
    expect(getScopedEsClient).toHaveBeenCalled();
    expect(esClient.get).toHaveBeenCalledWith(
      { index: 'team-pages', id: `team-a:wiki_detection_rule_${KEY}` },
      expect.anything()
    );
  });

  it('refuses a wiki nothing registered, before reaching Elasticsearch', async () => {
    const { registry, esClient, context } = setup();

    await expect(
      getRecallPageStepDefinition({ registry, logger }).handler(
        context({ ...recallInput, wiki_id: 'someone-elses' })
      )
    ).rejects.toMatchObject({ type: 'ValidationError' });
    expect(esClient.get).not.toHaveBeenCalled();
  });

  it('refuses a key outside the allowed alphabet', async () => {
    const { registry, context } = setup();

    await expect(
      getRecallPageStepDefinition({ registry, logger }).handler(
        context({ ...recallInput, key: 'space:other' })
      )
    ).rejects.toBeInstanceOf(ExecutionError);
  });

  it('reports a refused read as a permission error', async () => {
    const { registry, esClient, context } = setup();
    esClient.get.mockRejectedValue(statusError(403));

    await expect(
      getRecallPageStepDefinition({ registry, logger }).handler(context(recallInput))
    ).rejects.toMatchObject({ type: 'PermissionError' });
  });
});

describe('agentKnowledge.recordEntry', () => {
  it('records the entry with the execution as provenance', async () => {
    const { registry, esClient, context } = setup();

    const result = await getRecordEntryStepDefinition({ registry, logger }).handler(
      context(recordInput)
    );

    expect(result).toEqual({ output: { outcome: 'recorded', entry_count: 1 } });
    expect(esClient.create.mock.calls[0][0].document.attributes).toMatchObject({
      workflow_execution_id: 'exec-1',
      conversation_id: 'conv-1',
    });
  });

  it('reports a refused write as a permission error', async () => {
    const { registry, esClient, context } = setup();
    esClient.create.mockRejectedValue(statusError(403));

    await expect(
      getRecordEntryStepDefinition({ registry, logger }).handler(context(recordInput))
    ).rejects.toMatchObject({ type: 'PermissionError' });
  });

  it('refuses an empty entry', async () => {
    const { registry, esClient, context } = setup();

    await expect(
      getRecordEntryStepDefinition({ registry, logger }).handler(
        context({ ...recordInput, entry: { id: 'proposal-1', content: '' } })
      )
    ).rejects.toMatchObject({ type: 'ValidationError' });
    expect(esClient.get).not.toHaveBeenCalled();
  });
});
