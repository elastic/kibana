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

  it('emits observables added events', () => {
    const eventBus = new CasesEventBus();
    const listener = jest.fn();

    eventBus.onObservablesAdded(listener);
    eventBus.emitObservablesAdded(request, {
      caseId: 'case-1',
      owner: 'securitySolution',
      observableIds: ['obs-1'],
      observableTypeKeys: ['observable-type-ipv4'],
    });

    expect(listener).toHaveBeenCalledWith({
      type: 'observablesAdded',
      request,
      payload: {
        caseId: 'case-1',
        owner: 'securitySolution',
        observableIds: ['obs-1'],
        observableTypeKeys: ['observable-type-ipv4'],
      },
    });
  });

  it('isolates a throwing onObservablesAdded subscriber so later subscribers still fire', () => {
    const eventBus = new CasesEventBus();
    const throwingListener = jest.fn(() => {
      throw new Error('subscriber error');
    });
    const laterListener = jest.fn();

    eventBus.onObservablesAdded(throwingListener);
    eventBus.onObservablesAdded(laterListener);

    expect(() =>
      eventBus.emitObservablesAdded(request, {
        caseId: 'case-1',
        owner: 'securitySolution',
        observableIds: ['obs-1'],
        observableTypeKeys: ['observable-type-ipv4'],
      })
    ).not.toThrow();

    expect(throwingListener).toHaveBeenCalledTimes(1);
    expect(laterListener).toHaveBeenCalledTimes(1);
  });

  it('suppresses async rejections from onObservablesAdded subscribers', async () => {
    const eventBus = new CasesEventBus();
    const rejectingListener = jest.fn().mockRejectedValue(new Error('async error'));

    eventBus.onObservablesAdded(rejectingListener);

    // Should not throw synchronously or produce an unhandled rejection
    expect(() =>
      eventBus.emitObservablesAdded(request, {
        caseId: 'case-1',
        owner: 'securitySolution',
        observableIds: [],
        observableTypeKeys: [],
      })
    ).not.toThrow();

    // Let microtasks settle — the rejection is caught internally
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
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
