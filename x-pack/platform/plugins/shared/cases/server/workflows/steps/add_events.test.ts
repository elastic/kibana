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
});
