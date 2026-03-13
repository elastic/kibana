/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { getCaseStepDefinition } from './get_case';
import { createStepHandlerContext } from './test_utils';
import type { CasesClient } from '../../client';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.getCase' });

describe('getCaseStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = getCaseStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.getCase');
    expect(typeof definition.handler).toBe('function');
    expect(
      definition.inputSchema.safeParse({
        case_id: 'case-1',
        include_comments: true,
      }).success
    ).toBe(true);
  });

  it('fetches case with includeComments=true when include_comments is true', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
    } as unknown as CasesClient);
    const definition = getCaseStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({
        case_id: 'case-1',
        include_comments: true,
      })
    );

    expect(get).toHaveBeenCalledWith({ id: 'case-1', includeComments: true });
    expect(result).toEqual({
      output: {
        case: createCaseResponseFixture,
      },
    });
  });

  it('fetches case with includeComments=false when include_comments is false', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
    } as unknown as CasesClient);
    const definition = getCaseStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        case_id: 'case-1',
        include_comments: false,
      })
    );

    expect(get).toHaveBeenCalledWith({ id: 'case-1', includeComments: false });
  });

  it('returns error when client.cases.get throws', async () => {
    const getError = new Error('get failed');
    const get = jest.fn().mockRejectedValue(getError);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
    } as unknown as CasesClient);
    const definition = getCaseStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({
        case_id: 'case-1',
        include_comments: false,
      })
    );

    expect(result).toEqual({ error: getError });
  });

  it('returns normalized output when include_comments includes unsupported comment shapes', async () => {
    const get = jest.fn().mockResolvedValue({
      ...createCaseResponseFixture,
      comments: [
        {
          id: 'event-comment-id',
          type: 'event',
          eventId: ['event-1'],
          index: ['.ds-logs-*'],
          owner: createCaseResponseFixture.owner,
          created_at: '2020-02-19T23:06:33.798Z',
          created_by: createCaseResponseFixture.created_by,
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
          version: 'WzQ3LDFc',
        },
        {
          id: 'alert-comment-id',
          type: 'alert',
          alertId: ['alert-1'],
          index: ['.alerts-security.alerts-default'],
          owner: createCaseResponseFixture.owner,
          rule: { id: null, name: null },
          created_at: '2020-02-19T23:06:33.798Z',
          created_by: createCaseResponseFixture.created_by,
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
          version: 'WzQ3LDFc',
        },
      ],
    });
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
    } as unknown as CasesClient);
    const definition = getCaseStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({
        case_id: 'case-1',
        include_comments: true,
      })
    );

    const outputCase = result.output?.case;
    if (outputCase == null) {
      throw new Error('Expected output from get case step');
    }

    expect(outputCase.comments).toHaveLength(1);
    expect(outputCase.comments[0]).toMatchObject({
      id: 'alert-comment-id',
      type: 'alert',
    });
    expect(outputCase.comments[0]).not.toHaveProperty('rule');
  });
});
