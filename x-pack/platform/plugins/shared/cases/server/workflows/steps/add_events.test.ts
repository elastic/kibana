/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import type { CasesClient } from '../../client';
import { addEventsStepDefinition } from './add_events';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.addEvents' });

describe('addEventsStepDefinition', () => {
  it('adds events to a case', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkCreate = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { bulkCreate },
    } as unknown as CasesClient);
    const definition = addEventsStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        case_id: 'case-1',
        events: [{ eventId: 'event-1', index: '.ds-logs-*' }],
      })
    );

    expect(definition.id).toBe('cases.addEvents');
    expect(bulkCreate).toHaveBeenCalledWith({
      caseId: 'case-1',
      attachments: [
        {
          type: 'event',
          eventId: 'event-1',
          index: '.ds-logs-*',
          owner: createCaseResponseFixture.owner,
        },
      ],
    });
  });

  it('drops unsupported event comments from workflow output before parsing', async () => {
    const eventComment = {
      id: 'event-comment-id',
      type: 'event' as const,
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
    };
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkCreate = jest.fn().mockResolvedValue({
      ...createCaseResponseFixture,
      comments: [eventComment],
    });
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { bulkCreate },
    } as unknown as CasesClient);
    const definition = addEventsStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({
        case_id: 'case-1',
        events: [{ eventId: 'event-1', index: '.ds-logs-*' }],
      })
    );

    const outputCase = result.output?.case;
    if (outputCase == null) {
      throw new Error('Expected output from add events step');
    }

    expect(outputCase.comments).toEqual([]);
  });
});
