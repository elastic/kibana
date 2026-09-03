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

  describe('listener isolation', () => {
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

    it('isolates a throwing onCaseCreated subscriber so later subscribers still fire', () => {
      const eventBus = new CasesEventBus();
      const throwingListener = jest.fn(() => {
        throw new Error('subscriber error');
      });
      const laterListener = jest.fn();

      eventBus.onCaseCreated(throwingListener);
      eventBus.onCaseCreated(laterListener);

      expect(() =>
        eventBus.emitCaseCreated(request, { caseId: 'case-1', owner: 'securitySolution' })
      ).not.toThrow();

      expect(throwingListener).toHaveBeenCalledTimes(1);
      expect(laterListener).toHaveBeenCalledTimes(1);
    });

    it('isolates a throwing onCaseUpdated subscriber so later subscribers still fire', () => {
      const eventBus = new CasesEventBus();
      const throwingListener = jest.fn(() => {
        throw new Error('subscriber error');
      });
      const laterListener = jest.fn();

      eventBus.onCaseUpdated(throwingListener);
      eventBus.onCaseUpdated(laterListener);

      expect(() =>
        eventBus.emitCaseUpdated(
          request,
          { caseId: 'case-1', owner: 'securitySolution' },
          { previousCase: undefined, updatedCase: undefined }
        )
      ).not.toThrow();

      expect(throwingListener).toHaveBeenCalledTimes(1);
      expect(laterListener).toHaveBeenCalledTimes(1);
    });

    it('isolates a throwing onAttachmentsAdded subscriber so later subscribers still fire', () => {
      const eventBus = new CasesEventBus();
      const throwingListener = jest.fn(() => {
        throw new Error('subscriber error');
      });
      const laterListener = jest.fn();

      eventBus.onAttachmentsAdded(throwingListener);
      eventBus.onAttachmentsAdded(laterListener);

      expect(() =>
        eventBus.emitAttachmentsAdded(request, {
          caseId: 'case-1',
          owner: 'securitySolution',
          attachmentIds: ['att-1'],
          attachmentType: 'user',
        })
      ).not.toThrow();

      expect(throwingListener).toHaveBeenCalledTimes(1);
      expect(laterListener).toHaveBeenCalledTimes(1);
    });

    it('isolates a throwing onAlertStatusChanged subscriber so later subscribers still fire', () => {
      const eventBus = new CasesEventBus();
      const throwingListener = jest.fn(() => {
        throw new Error('subscriber error');
      });
      const laterListener = jest.fn();

      eventBus.onAlertStatusChanged(throwingListener);
      eventBus.onAlertStatusChanged(laterListener);

      expect(() =>
        eventBus.emitAlertStatusChanged(request, {
          alertIds: ['alert-1'],
          status: 'open',
          previousStatuses: [],
          alertIdToIndex: {},
          indices: [],
        })
      ).not.toThrow();

      expect(throwingListener).toHaveBeenCalledTimes(1);
      expect(laterListener).toHaveBeenCalledTimes(1);
    });

    it('suppresses async rejections from onObservablesAdded subscribers and still fires later subscribers', async () => {
      const eventBus = new CasesEventBus();
      const rejectingListener = jest.fn().mockRejectedValue(new Error('async error'));
      const laterListener = jest.fn();

      eventBus.onObservablesAdded(rejectingListener);
      eventBus.onObservablesAdded(laterListener);

      // Should not throw synchronously
      expect(() =>
        eventBus.emitObservablesAdded(request, {
          caseId: 'case-1',
          owner: 'securitySolution',
          observableIds: [],
          observableTypeKeys: [],
        })
      ).not.toThrow();

      // Later subscriber still fires synchronously
      expect(laterListener).toHaveBeenCalledTimes(1);

      // Let microtasks settle — the rejection is caught internally
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
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
