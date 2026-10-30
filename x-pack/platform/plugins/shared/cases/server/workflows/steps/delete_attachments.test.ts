/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClient } from '../../client';
import { deleteAttachmentsStepDefinition } from './delete_attachments';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.deleteAttachments' });

const validInput = {
  case_id: 'case-1',
  ids: ['a-1', 'a-2'],
};

const setup = (bulkDelete: jest.Mock = jest.fn().mockResolvedValue(undefined)) => {
  const getCasesClient = jest.fn().mockResolvedValue({
    attachments: { bulkDelete },
  } as unknown as CasesClient);
  return { definition: deleteAttachmentsStepDefinition(getCasesClient), bulkDelete };
};

describe('deleteAttachmentsStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const { definition } = setup();

    expect(definition.id).toBe('cases.deleteAttachments');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(validInput).success).toBe(true);
  });

  it('calls attachments.bulkDelete once and echoes the identifiers', async () => {
    const { definition, bulkDelete } = setup();

    const result = await definition.handler(createContext(validInput));

    expect(bulkDelete).toHaveBeenCalledTimes(1);
    expect(bulkDelete).toHaveBeenCalledWith({
      caseId: 'case-1',
      savedObjectIds: ['a-1', 'a-2'],
    });
    expect(result).toEqual({
      output: { case_id: 'case-1', ids: ['a-1', 'a-2'] },
    });
  });

  it('passes include_related to attachments.bulkDelete', async () => {
    const { definition, bulkDelete } = setup();

    await definition.handler(createContext({ ...validInput, include_related: false }));

    expect(bulkDelete).toHaveBeenCalledWith({
      caseId: 'case-1',
      savedObjectIds: ['a-1', 'a-2'],
      includeRelated: false,
    });
  });

  it('returns each deleted id once when the input repeats ids', async () => {
    const { definition } = setup();

    const result = await definition.handler(
      createContext({ case_id: 'case-1', ids: ['a-1', 'a-1', 'a-2'] })
    );

    expect(result).toEqual({
      output: { case_id: 'case-1', ids: ['a-1', 'a-2'] },
    });
  });

  it('does not delete anything once the run is aborted', async () => {
    const { definition, bulkDelete } = setup();
    const controller = new AbortController();
    controller.abort();

    const result = await definition.handler(
      createStepHandlerContext({
        input: validInput,
        stepType: 'cases.deleteAttachments',
        overrides: { abortSignal: controller.signal },
      })
    );

    expect(bulkDelete).not.toHaveBeenCalled();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('returns error when attachments.bulkDelete throws', async () => {
    const { definition } = setup(
      jest.fn().mockRejectedValue(new Error('Attachment a-2 does not exist on case case-1.'))
    );

    const result = await definition.handler(createContext(validInput));

    expect(result.output).toBeUndefined();
    expect(result.error?.message).toBe(
      'Attachments could not be deleted on case "case-1": a-1, a-2. Reason: Attachment a-2 does not exist on case case-1.'
    );
  });
});
