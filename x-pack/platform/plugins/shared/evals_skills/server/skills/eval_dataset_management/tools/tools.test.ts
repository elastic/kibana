/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { EvalDatasetManagementToolDeps } from './deps';
import { copyDatasetTool } from './copy_dataset';
import { createDatasetTool } from './create_dataset';
import { deleteDatasetTool } from './delete_dataset';
import { getDatasetTool } from './get_dataset';
import { upsertDatasetTool } from './upsert_dataset';
import { evalsDatasetTools, MAX_RETURNED_DATASET_EXAMPLES } from './tool_utils';

const createContext = (spaceId = 'default'): ToolHandlerContext =>
  ({ request: httpServerMock.createKibanaRequest(), spaceId } as unknown as ToolHandlerContext);

const firstResult = (ret: unknown) =>
  (ret as { results: Array<{ type: string; data: any }> }).results[0];

interface DatasetClientMock {
  get: jest.Mock;
  create: jest.Mock;
  upsert: jest.Mock;
  copy: jest.Mock;
  delete: jest.Mock;
}

const datasetDocument = {
  id: 'd1',
  name: 'bank',
  description: 'Banking questions',
  tags: ['esql'],
  maturity: 'raw' as const,
  examples_count: 1,
  space_ids: ['default'],
  examples: [
    { id: 'e1', input: { q: 'hi' }, output: { a: 'hello' }, metadata: { source: 'chat' } },
  ],
};

const createDeps = (
  startDependencies: Record<string, unknown> | undefined = undefined
): { deps: EvalDatasetManagementToolDeps; datasetClient: DatasetClientMock } => {
  const datasetClient: DatasetClientMock = {
    get: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    copy: jest.fn(),
    delete: jest.fn(),
  };
  const deps: EvalDatasetManagementToolDeps = {
    serverBasePath: '',
    logger: loggingSystemMock.createLogger(),
    getStartDependencies: jest.fn().mockResolvedValue(
      startDependencies ?? {
        evals: { datasetService: { getClient: jest.fn().mockReturnValue(datasetClient) } },
      }
    ),
  };
  return { deps, datasetClient };
};

const securityWith = (hasAllRequested: boolean, datasetClient?: DatasetClientMock) =>
  ({
    evals: {
      datasetService: datasetClient
        ? { getClient: jest.fn().mockReturnValue(datasetClient) }
        : undefined,
    },
    security: {
      authz: {
        actions: { api: { get: (privilege: string) => `api:${privilege}` } },
        checkPrivilegesWithRequest: () => ({
          atSpace: async () => ({ hasAllRequested }),
        }),
      },
    },
  } as unknown as Awaited<ReturnType<EvalDatasetManagementToolDeps['getStartDependencies']>>);

const alreadyExistsError = (name: string) => {
  const error = new Error(`Dataset with name "${name}" already exists`);
  error.name = 'DatasetAlreadyExistsError';
  return error;
};

const confirmationOf = async (
  tool: { confirmation?: { getConfirmation?: (ctx: any) => any } },
  toolParams: Record<string, unknown>
) => tool.confirmation?.getConfirmation?.({ toolParams, context: createContext() });

describe('getDatasetTool', () => {
  it('returns dataset metadata and its examples', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.get.mockResolvedValue(datasetDocument);

    const result = firstResult(
      await getDatasetTool(deps).handler({ dataset_id: 'd1' }, createContext())
    );

    expect(result.type).toBe(ToolResultType.other);
    expect(result.data).toEqual({
      id: 'd1',
      name: 'bank',
      description: 'Banking questions',
      tags: ['esql'],
      maturity: 'raw',
      examples_count: 1,
      shared_with_other_spaces: false,
      examples: [
        { id: 'e1', input: { q: 'hi' }, output: { a: 'hello' }, metadata: { source: 'chat' } },
      ],
      examples_omitted: 0,
    });
  });

  it('truncates examples past the return bound and reports how many were omitted', async () => {
    const { deps, datasetClient } = createDeps();
    const examples = Array.from({ length: MAX_RETURNED_DATASET_EXAMPLES + 2 }, (_, index) => ({
      id: `e${index}`,
      input: { q: index },
    }));
    datasetClient.get.mockResolvedValue({
      ...datasetDocument,
      examples_count: examples.length,
      examples,
    });

    const result = firstResult(
      await getDatasetTool(deps).handler({ dataset_id: 'd1' }, createContext())
    );

    expect(result.data.examples).toHaveLength(MAX_RETURNED_DATASET_EXAMPLES);
    expect(result.data.examples_omitted).toBe(2);
  });

  it('reports a dataset shared with another space', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.get.mockResolvedValue({
      ...datasetDocument,
      space_ids: ['default', 'marketing'],
    });

    const result = firstResult(
      await getDatasetTool(deps).handler({ dataset_id: 'd1' }, createContext('default'))
    );

    expect(result.data.shared_with_other_spaces).toBe(true);
  });

  it('returns an error when the dataset does not exist', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.get.mockResolvedValue(undefined);

    const result = firstResult(
      await getDatasetTool(deps).handler({ dataset_id: 'missing' }, createContext())
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toBe('Evaluation dataset not found: missing');
  });

  it('refuses callers without the read privilege', async () => {
    const { deps } = createDeps(securityWith(false) as unknown as Record<string, unknown>);

    const result = firstResult(
      await getDatasetTool(deps).handler({ dataset_id: 'd1' }, createContext())
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/read_evals/);
  });

  it('returns an error when the dataset service is unavailable', async () => {
    const { deps } = createDeps({ evals: {} });

    const result = firstResult(
      await getDatasetTool(deps).handler({ dataset_id: 'd1' }, createContext())
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/dataset service is unavailable/);
  });
});

describe('createDatasetTool', () => {
  const input = {
    name: 'bank',
    description: 'Banking questions',
    examples: [{ input: { q: 'hi' }, output: { a: 'hello' } }],
  };

  it('creates the dataset and returns its id', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.create.mockResolvedValue({ id: 'd1', name: 'bank', examples_count: 1 });

    const result = firstResult(await createDatasetTool(deps).handler(input, createContext()));

    expect(datasetClient.create).toHaveBeenCalledWith({
      name: 'bank',
      description: 'Banking questions',
      tags: undefined,
      maturity: undefined,
      examples: input.examples,
    });
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data).toEqual({ dataset_id: 'd1', name: 'bank', examples_count: 1 });
  });

  it('points a taken name at upsert', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.create.mockRejectedValue(alreadyExistsError('bank'));

    const result = firstResult(await createDatasetTool(deps).handler(input, createContext()));

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toContain('already exists');
    expect(result.data.message).toContain(evalsDatasetTools.upsertDataset);
  });

  it('asks the user to confirm before creating', async () => {
    const { deps } = createDeps();
    const confirmation = await confirmationOf(createDatasetTool(deps), input);

    expect(confirmation).toEqual({
      title: 'Create evaluation dataset?',
      message: 'This creates dataset "bank" with 1 example(s) in the current space.',
      confirm_text: 'Create dataset',
      cancel_text: 'Cancel',
    });
  });

  it('refuses callers without the manage privilege', async () => {
    const { deps } = createDeps(securityWith(false) as unknown as Record<string, unknown>);

    const result = firstResult(await createDatasetTool(deps).handler(input, createContext()));

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/manage_evals/);
  });
});

describe('upsertDatasetTool', () => {
  const input = {
    name: 'bank',
    description: 'Banking questions',
    examples: [{ input: { q: 'hi' } }, { input: { q: 'bye' } }],
  };

  it('returns how many examples were added, removed, and unchanged', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.upsert.mockResolvedValue({
      dataset_id: 'd1',
      added: 2,
      removed: 1,
      unchanged: 3,
    });

    const result = firstResult(await upsertDatasetTool(deps).handler(input, createContext()));

    expect(result.type).toBe(ToolResultType.other);
    expect(result.data).toEqual({ dataset_id: 'd1', added: 2, removed: 1, unchanged: 3 });
  });

  it('warns that an existing example set is replaced', async () => {
    const { deps } = createDeps();
    const confirmation = await confirmationOf(upsertDatasetTool(deps), input);

    expect(confirmation?.message).toMatch(/example set is replaced/);
    expect(confirmation?.message).toMatch(/missing from this payload is removed/);
  });

  it('returns an error when the dataset service is unavailable', async () => {
    const { deps } = createDeps({ evals: {} });

    const result = firstResult(await upsertDatasetTool(deps).handler(input, createContext()));

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/dataset service is unavailable/);
  });
});

describe('copyDatasetTool', () => {
  it('copies the dataset under the new name', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.copy.mockResolvedValue({ id: 'd2', name: 'bank-copy', examples_count: 4 });

    const result = firstResult(
      await copyDatasetTool(deps).handler(
        { dataset_id: 'd1', name: 'bank-copy', description: 'A copy' },
        createContext()
      )
    );

    expect(datasetClient.copy).toHaveBeenCalledWith('d1', {
      name: 'bank-copy',
      description: 'A copy',
    });
    expect(result.data).toEqual({ dataset_id: 'd2', name: 'bank-copy', examples_count: 4 });
  });

  it('returns an error when the source dataset does not exist', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.copy.mockResolvedValue(undefined);

    const result = firstResult(
      await copyDatasetTool(deps).handler({ dataset_id: 'missing', name: 'copy' }, createContext())
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toBe('Evaluation dataset not found: missing');
  });

  it('asks for a different name when the copy name is taken', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.copy.mockRejectedValue(alreadyExistsError('bank'));

    const result = firstResult(
      await copyDatasetTool(deps).handler({ dataset_id: 'd1', name: 'bank' }, createContext())
    );

    expect(result.data.message).toMatch(/Choose a different name/);
  });
});

describe('deleteDatasetTool', () => {
  it('reports a shared dataset as detached rather than deleted', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.delete.mockResolvedValue('unshared');

    const result = firstResult(
      await deleteDatasetTool(deps).handler({ dataset_id: 'd1' }, createContext())
    );

    expect(datasetClient.delete).toHaveBeenCalledWith('d1', { intent: undefined });
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data).toEqual({ dataset_id: 'd1', deleted: false, unshared: true });
  });

  it('reports a dataset that was deleted', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.delete.mockResolvedValue('deleted');

    const result = firstResult(
      await deleteDatasetTool(deps).handler({ dataset_id: 'd1', intent: 'delete' }, createContext())
    );

    expect(datasetClient.delete).toHaveBeenCalledWith('d1', { intent: 'delete' });
    expect(result.data).toEqual({ dataset_id: 'd1', deleted: true, unshared: false });
  });

  it('explains an intent mismatch when a delete would only unshare', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.delete.mockResolvedValue('intent_mismatch');

    const result = firstResult(
      await deleteDatasetTool(deps).handler({ dataset_id: 'd1', intent: 'delete' }, createContext())
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/only remove it from this one/);
  });

  it('explains an intent mismatch when an unshare would delete', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.delete.mockResolvedValue('intent_mismatch');

    const result = firstResult(
      await deleteDatasetTool(deps).handler(
        { dataset_id: 'd1', intent: 'unshare' },
        createContext()
      )
    );

    expect(result.data.message).toMatch(/would delete it/);
  });

  it('returns an error when the dataset does not exist', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.delete.mockResolvedValue('not_found');

    const result = firstResult(
      await deleteDatasetTool(deps).handler({ dataset_id: 'missing' }, createContext())
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toBe('Evaluation dataset not found: missing');
  });

  it('describes a permanent delete when that intent is set', async () => {
    const { deps } = createDeps();
    const confirmation = await confirmationOf(deleteDatasetTool(deps), {
      dataset_id: 'd1',
      intent: 'delete',
    });

    expect(confirmation?.message).toMatch(/permanently deletes/);
  });

  it('describes a detach-or-delete when no intent is set', async () => {
    const { deps } = createDeps();
    const confirmation = await confirmationOf(deleteDatasetTool(deps), { dataset_id: 'd1' });

    expect(confirmation?.message).toMatch(/only detached here/);
    expect(confirmation?.message).toMatch(/examples are deleted/);
  });
});
