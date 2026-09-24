/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { ZodObject, z } from '@kbn/zod/v4';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { evalsDatasetTools } from '../../common/tool_ids';
import type { EvalDatasetManagementToolDeps } from './deps';
import { copyDatasetTool } from './copy_dataset';
import { createDatasetTool } from './create_dataset';
import { deleteDatasetTool } from './delete_dataset';
import { editExamplesTool } from './edit_examples';
import { getDatasetTool } from './get_dataset';
import { upsertDatasetTool } from './upsert_dataset';
import { MAX_RETURNED_DATASET_EXAMPLES } from './tool_utils';

const createContext = (spaceId = 'default'): ToolHandlerContext =>
  ({ request: httpServerMock.createKibanaRequest(), spaceId } as unknown as ToolHandlerContext);

interface FirstResult {
  type: string;
  data: Record<string, unknown>;
}

const firstResult = (ret: unknown): FirstResult => (ret as { results: FirstResult[] }).results[0];

interface DatasetClientMock {
  get: jest.Mock;
  getMetadata: jest.Mock;
  getExamplesPage: jest.Mock;
  datasetExists: jest.Mock;
  create: jest.Mock;
  upsert: jest.Mock;
  addExamples: jest.Mock;
  deleteExamples: jest.Mock;
  resolveByName: jest.Mock;
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
    getMetadata: jest.fn(),
    getExamplesPage: jest.fn(),
    datasetExists: jest.fn().mockResolvedValue(true),
    create: jest.fn(),
    upsert: jest.fn(),
    addExamples: jest.fn(),
    deleteExamples: jest.fn().mockResolvedValue({ deleted: [], notFound: [] }),
    resolveByName: jest.fn(),
    copy: jest.fn(),
    delete: jest.fn(),
  };
  const deps: EvalDatasetManagementToolDeps = {
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

const confirmationOf = async <Schema extends ZodObject>(
  tool: BuiltinSkillBoundedTool<Schema>,
  toolParams: NoInfer<z.infer<Schema>>
) => tool.confirmation?.getConfirmation?.({ toolParams, context: createContext() });

describe('getDatasetTool', () => {
  const mockStoredDataset = (
    datasetClient: DatasetClientMock,
    {
      examples,
      ...metadata
    }: Omit<typeof datasetDocument, 'examples'> & { examples: Array<{ id: string }> }
  ) => {
    datasetClient.getMetadata.mockResolvedValue(metadata);
    datasetClient.getExamplesPage.mockImplementation(
      async (_datasetId: string, { from, size }: { from: number; size: number }) => ({
        examples: examples.slice(from, from + size),
        total: examples.length,
      })
    );
  };

  it('returns dataset metadata and its examples', async () => {
    const { deps, datasetClient } = createDeps();
    mockStoredDataset(datasetClient, datasetDocument);

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
      shared_with_other_spaces: false,
      examples_count: 1,
      offset: 0,
      examples_omitted: 0,
      examples: [
        { id: 'e1', input: { q: 'hi' }, output: { a: 'hello' }, metadata: { source: 'chat' } },
      ],
    });
  });

  it('lists the counts before the examples so they survive truncation', async () => {
    const { deps, datasetClient } = createDeps();
    mockStoredDataset(datasetClient, datasetDocument);

    const result = firstResult(
      await getDatasetTool(deps).handler({ dataset_id: 'd1' }, createContext())
    );

    const keys = Object.keys(result.data);
    expect(keys.indexOf('examples_omitted')).toBeLessThan(keys.indexOf('examples'));
  });

  it('pages through examples from the given offset', async () => {
    const { deps, datasetClient } = createDeps();
    const examples = Array.from({ length: MAX_RETURNED_DATASET_EXAMPLES + 10 }, (_, index) => ({
      id: `e${index}`,
      input: { q: index },
    }));
    mockStoredDataset(datasetClient, {
      ...datasetDocument,
      examples_count: examples.length,
      examples,
    });

    const result = firstResult(
      await getDatasetTool(deps).handler(
        { dataset_id: 'd1', offset: MAX_RETURNED_DATASET_EXAMPLES },
        createContext()
      )
    );

    expect(datasetClient.getExamplesPage).toHaveBeenCalledWith('d1', {
      from: MAX_RETURNED_DATASET_EXAMPLES,
      size: MAX_RETURNED_DATASET_EXAMPLES,
    });
    expect(result.data.offset).toBe(MAX_RETURNED_DATASET_EXAMPLES);
    expect(result.data.examples).toHaveLength(10);
    expect((result.data.examples as Array<{ id: string }>)[0].id).toBe(
      `e${MAX_RETURNED_DATASET_EXAMPLES}`
    );
    expect(result.data.examples_omitted).toBe(MAX_RETURNED_DATASET_EXAMPLES);
  });

  it('truncates examples past the return bound and reports how many were omitted', async () => {
    const { deps, datasetClient } = createDeps();
    const examples = Array.from({ length: MAX_RETURNED_DATASET_EXAMPLES + 2 }, (_, index) => ({
      id: `e${index}`,
      input: { q: index },
    }));
    mockStoredDataset(datasetClient, {
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
    mockStoredDataset(datasetClient, {
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
    datasetClient.getMetadata.mockResolvedValue(undefined);
    datasetClient.getExamplesPage.mockResolvedValue(undefined);

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
      message: [
        'This creates a dataset in the current space.',
        [
          '- **Name:** `bank`',
          '- **Description:** `Banking questions`',
          '- **Tags:** _none_',
          '- **Maturity:** _not set_',
          '- **Examples:** 1',
        ].join('\n'),
        '**First examples:**\n\n1. Input: `{"q":"hi"}`\n   Expected output: `{"a":"hello"}`',
      ].join('\n\n'),
      confirm_text: 'Create dataset',
      cancel_text: 'Cancel',
    });
  });

  it('previews only the first examples and flags missing expected outputs', async () => {
    const { deps } = createDeps();
    const examples = Array.from({ length: 5 }, (_, index) => ({ input: { q: index } }));
    const confirmation = await confirmationOf(createDatasetTool(deps), { ...input, examples });

    expect(confirmation?.message).toContain('3. Input: `{"q":2}`');
    expect(confirmation?.message).not.toContain('{"q":3}');
    expect(confirmation?.message).toContain('…and 2 more.');
    expect(confirmation?.message).toContain('**5 example(s) have no expected output.**');
  });

  it('shows caller-supplied values verbatim rather than as markdown', async () => {
    const { deps } = createDeps();
    const confirmation = await confirmationOf(createDatasetTool(deps), {
      ...input,
      description: 'See `code` and\n[a link](https://example.com)',
    });

    expect(confirmation?.message).toContain(
      "- **Description:** `See 'code' and [a link](https://example.com)`"
    );
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

  it('compares an existing dataset with the payload', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.resolveByName.mockResolvedValue({ ...datasetDocument, examples_count: 5 });

    const confirmation = await confirmationOf(upsertDatasetTool(deps), {
      ...input,
      tags: ['ESQL'],
      maturity: 'golden',
    });

    expect(datasetClient.resolveByName).toHaveBeenCalledWith('bank');
    expect(confirmation?.title).toBe('Replace evaluation dataset examples?');
    expect(confirmation?.message).toBe(
      [
        'This replaces the examples of dataset `bank` in the current space. It currently has 5 example(s); afterwards it holds exactly the 2 example(s) in this payload.',
        [
          '- **Description:** `Banking questions` (unchanged)',
          '- **Tags:** `esql` (unchanged)',
          '- **Maturity:** `raw` → `golden`',
        ].join('\n'),
        '**Any existing example missing from this payload is removed.**',
        '**First examples:**\n\n1. Input: `{"q":"hi"}`\n   Expected output: _none_\n2. Input: `{"q":"bye"}`\n   Expected output: _none_',
        '**2 example(s) have no expected output.**',
      ].join('\n\n')
    );
  });

  it('warns when other spaces share the dataset being replaced', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.resolveByName.mockResolvedValue({
      ...datasetDocument,
      space_ids: ['default', 'marketing'],
    });

    const confirmation = await confirmationOf(upsertDatasetTool(deps), input);

    expect(confirmation?.message).toContain(
      '**This dataset is shared with 1 other space(s); the change applies there too.**'
    );
  });

  it('keeps undeclared tags and maturity as is', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.resolveByName.mockResolvedValue(datasetDocument);

    const confirmation = await confirmationOf(upsertDatasetTool(deps), input);

    expect(confirmation?.message).toContain('- **Tags:** _kept as is_');
    expect(confirmation?.message).toContain('- **Maturity:** _kept as is_');
  });

  it('describes an upsert of an unknown name as a create', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.resolveByName.mockResolvedValue(undefined);

    const confirmation = await confirmationOf(upsertDatasetTool(deps), input);

    expect(confirmation?.title).toBe('Create evaluation dataset?');
    expect(confirmation?.message).toMatch(/No dataset named `bank` exists in this space/);
    expect(confirmation?.message).toContain('- **Examples:** 2');
  });

  it('falls back to a generic replace warning when the preview fails', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.resolveByName.mockRejectedValue(new Error('boom'));

    const confirmation = await confirmationOf(upsertDatasetTool(deps), input);

    expect(confirmation?.confirm_text).toBe('Upsert dataset');
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

describe('editExamplesTool', () => {
  const examples = [{ input: { q: 'hi' }, output: { a: 'hello' } }, { input: { q: 'bye' } }];

  it('removes examples first, then adds, and reports both', async () => {
    const { deps, datasetClient } = createDeps();
    const calls: string[] = [];
    datasetClient.deleteExamples.mockImplementation(async () => {
      calls.push('delete');
      return { deleted: ['e1'], notFound: ['missing'] };
    });
    datasetClient.addExamples.mockImplementation(async () => {
      calls.push('add');
      return { added: 1, conflicts: 1 };
    });

    const result = firstResult(
      await editExamplesTool(deps).handler(
        { dataset_id: 'd1', add: examples, remove_ids: ['e1', 'missing', 'e1'] },
        createContext()
      )
    );

    expect(calls).toEqual(['delete', 'add']);
    expect(datasetClient.deleteExamples).toHaveBeenCalledWith('d1', ['e1', 'missing', 'e1']);
    expect(datasetClient.addExamples).toHaveBeenCalledWith('d1', examples, {
      rejectDuplicates: false,
    });
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data).toEqual({
      dataset_id: 'd1',
      removed: ['e1'],
      not_found: ['missing'],
      added: 1,
      skipped_duplicates: 1,
    });
  });

  it('reports what was already removed when adding fails', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.deleteExamples.mockResolvedValue({ deleted: ['e1'], notFound: [] });
    datasetClient.addExamples.mockRejectedValue(new Error('boom'));

    const result = firstResult(
      await editExamplesTool(deps).handler(
        { dataset_id: 'd1', add: examples, remove_ids: ['e1'] },
        createContext()
      )
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data).toEqual({
      message: 'Failed to edit the examples of an evaluation dataset: boom',
      metadata: { removed: ['e1'], added: 0 },
    });
  });

  it('explains a full dataset', async () => {
    const { deps, datasetClient } = createDeps();
    const error = new Error('A dataset can contain at most 10000 examples');
    error.name = 'DatasetExamplesLimitExceededError';
    datasetClient.addExamples.mockRejectedValue(error);

    const result = firstResult(
      await editExamplesTool(deps).handler({ dataset_id: 'd1', add: examples }, createContext())
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toBe(
      'A dataset can contain at most 10000 examples. Remove more examples first, or add them to a different dataset.'
    );
  });

  it('refuses a dataset this space cannot see', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.deleteExamples.mockResolvedValue(undefined);

    const result = firstResult(
      await editExamplesTool(deps).handler(
        { dataset_id: 'd1', add: examples, remove_ids: ['e1'] },
        createContext()
      )
    );

    expect(datasetClient.addExamples).not.toHaveBeenCalled();
    expect(result.data.message).toBe('Evaluation dataset not found: d1');
  });

  it('refuses callers without the manage privilege', async () => {
    const { deps } = createDeps(securityWith(false) as unknown as Record<string, unknown>);

    const result = firstResult(
      await editExamplesTool(deps).handler({ dataset_id: 'd1', add: examples }, createContext())
    );

    expect(result.data.message).toMatch(/manage_evals/);
  });

  it('rejects an edit that neither adds nor removes anything', () => {
    expect(editExamplesTool(createDeps().deps).schema.safeParse({ dataset_id: 'd1' }).success).toBe(
      false
    );
  });

  it('names the dataset, summarizes the edit, and previews added examples', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.getMetadata.mockResolvedValue({ ...datasetDocument, examples_count: 5 });

    const confirmation = await confirmationOf(editExamplesTool(deps), {
      dataset_id: 'd1',
      add: examples,
      remove_ids: ['e1'],
    });

    expect(confirmation?.message).toContain(
      'This removes 1 example(s) and adds 2 example(s) in dataset `bank`, which currently has 5 example(s). Every other example is kept.'
    );
    expect(confirmation?.message).toContain('1. Input: `{"q":"hi"}`');
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

  it('names the source dataset and what the copy inherits', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.getMetadata.mockResolvedValue(datasetDocument);

    const confirmation = await confirmationOf(copyDatasetTool(deps), {
      dataset_id: 'd1',
      name: 'bank-copy',
    });

    expect(datasetClient.getMetadata).toHaveBeenCalledWith('d1');
    expect(confirmation?.message).toBe(
      [
        'This copies dataset `bank` and its 1 example(s) into a new dataset in the current space.',
        [
          '- **New name:** `bank-copy`',
          '- **Description:** `Banking questions` (from the source)',
          '- **Tags:** `esql` (from the source)',
          '- **Maturity:** `raw` (from the source)',
        ].join('\n'),
      ].join('\n\n')
    );
  });

  it('says when the source dataset is missing', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.getMetadata.mockResolvedValue(undefined);

    const confirmation = await confirmationOf(copyDatasetTool(deps), {
      dataset_id: 'missing',
      name: 'copy',
    });

    expect(confirmation?.message).toMatch(/`missing` was not found in this space/);
  });
});

describe('deleteDatasetTool', () => {
  const sharedDataset = { ...datasetDocument, space_ids: ['default', 'marketing'] };

  it('detaches a dataset other spaces share', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.getMetadata.mockResolvedValue(sharedDataset);
    datasetClient.delete.mockResolvedValue('unshared');

    const result = firstResult(
      await deleteDatasetTool(deps).handler({ dataset_id: 'd1' }, createContext())
    );

    expect(datasetClient.delete).toHaveBeenCalledWith('d1', { intent: 'unshare' });
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data).toEqual({ dataset_id: 'd1', deleted: false, unshared: true });
  });

  it('deletes a dataset only this space holds', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.getMetadata.mockResolvedValue(datasetDocument);
    datasetClient.delete.mockResolvedValue('deleted');

    const result = firstResult(
      await deleteDatasetTool(deps).handler({ dataset_id: 'd1' }, createContext())
    );

    expect(datasetClient.delete).toHaveBeenCalledWith('d1', { intent: 'delete' });
    expect(result.data).toEqual({ dataset_id: 'd1', deleted: true, unshared: false });
  });

  it('refuses rather than deletes when the other spaces stop sharing it mid-delete', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.getMetadata.mockResolvedValue(sharedDataset);
    datasetClient.delete.mockResolvedValue('intent_mismatch');

    const result = firstResult(
      await deleteDatasetTool(deps).handler({ dataset_id: 'd1' }, createContext())
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/^Nothing was changed: the other spaces stopped sharing/);
  });

  it('refuses rather than detaches when another space starts sharing it mid-delete', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.getMetadata.mockResolvedValue(datasetDocument);
    datasetClient.delete.mockResolvedValue('intent_mismatch');

    const result = firstResult(
      await deleteDatasetTool(deps).handler({ dataset_id: 'd1' }, createContext())
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/^Nothing was changed: another space started sharing/);
  });

  it('returns an error when the dataset does not exist', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.getMetadata.mockResolvedValue(undefined);

    const result = firstResult(
      await deleteDatasetTool(deps).handler({ dataset_id: 'missing' }, createContext())
    );

    expect(datasetClient.delete).not.toHaveBeenCalled();
    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toBe('Evaluation dataset not found: missing');
  });

  it('returns an error when the dataset disappears before the delete', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.getMetadata.mockResolvedValue(datasetDocument);
    datasetClient.delete.mockResolvedValue('not_found');

    const result = firstResult(
      await deleteDatasetTool(deps).handler({ dataset_id: 'd1' }, createContext())
    );

    expect(result.data.message).toBe('Evaluation dataset not found: d1');
  });

  it('describes a permanent delete of a dataset only this space holds', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.getMetadata.mockResolvedValue(datasetDocument);

    const confirmation = await confirmationOf(deleteDatasetTool(deps), { dataset_id: 'd1' });

    expect(confirmation?.message).toBe(
      'This **permanently deletes** dataset `bank` and its 1 example(s).'
    );
  });

  it('describes a detach of a dataset other spaces share', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.getMetadata.mockResolvedValue(sharedDataset);

    const confirmation = await confirmationOf(deleteDatasetTool(deps), { dataset_id: 'd1' });

    expect(confirmation?.message).toBe(
      'This removes dataset `bank` from the current space only. It stays available, with its 1 example(s), in 1 other space(s).'
    );
  });

  it('falls back to describing both outcomes when the lookup fails', async () => {
    const { deps, datasetClient } = createDeps();
    datasetClient.getMetadata.mockRejectedValue(new Error('boom'));

    const confirmation = await confirmationOf(deleteDatasetTool(deps), { dataset_id: 'd1' });

    expect(confirmation?.message).toMatch(/only detached here/);
    expect(confirmation?.message).toMatch(/examples are deleted/);
  });

  it('falls back to describing both outcomes when the caller cannot read datasets', async () => {
    const { deps } = createDeps(securityWith(false) as unknown as Record<string, unknown>);

    const confirmation = await confirmationOf(deleteDatasetTool(deps), { dataset_id: 'd1' });

    expect(confirmation?.message).toMatch(/only detached here/);
  });
});
