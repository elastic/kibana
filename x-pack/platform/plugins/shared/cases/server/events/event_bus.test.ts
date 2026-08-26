/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { CasesEventBus } from './event_bus';

describe('CasesEventBus', () => {
  const request = httpServerMock.createKibanaRequest();

  it('emits case created events', () => {
    const eventBus = new CasesEventBus();
    const listener = jest.fn();

    eventBus.onCaseCreated(listener);
    eventBus.emitCaseCreated(request, { caseId: 'case-1', owner: 'securitySolution' });

    expect(listener).toHaveBeenCalledWith({
      type: 'caseCreated',
      request,
      payload: { caseId: 'case-1', owner: 'securitySolution' },
    });
  });

  it('emits case updated events with updated fields', () => {
    const eventBus = new CasesEventBus();
    const listener = jest.fn();

    eventBus.onCaseUpdated(listener);
    eventBus.emitCaseUpdated(
      request,
      {
        caseId: 'case-1',
        owner: 'securitySolution',
        updatedFields: ['title'],
      },
      { previousCase: undefined, updatedCase: undefined }
    );

    expect(listener).toHaveBeenCalledWith(
      {
        type: 'caseUpdated',
        request,
        payload: { caseId: 'case-1', owner: 'securitySolution', updatedFields: ['title'] },
      },
      expect.anything()
    );
  });
});
