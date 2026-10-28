/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from '../../../common/types/domain';
import { createCasesClientMockArgs } from '../mocks';
import { emitObservablesAddedEvent } from './trigger_utils';
import type { CaseSavedObjectTransformed } from '../../common/types/case';

const makeCase = (id = 'case-1', owner = 'securitySolution') =>
  ({ id, attributes: { owner } } as unknown as CaseSavedObjectTransformed);

const makeObservable = (overrides: Partial<Observable> = {}): Observable => ({
  id: 'obs-1',
  typeKey: 'observable-type-ipv4',
  value: '1.2.3.4',
  description: 'test description',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: null,
  ...overrides,
});

describe('emitObservablesAddedEvent', () => {
  it('emits observablesAdded with ids and type keys in insertion order, index-aligned', () => {
    const clientArgs = createCasesClientMockArgs();
    const theCase = makeCase();
    const observables = [
      makeObservable({ id: 'obs-1', typeKey: 'observable-type-url' }),
      makeObservable({ id: 'obs-2', typeKey: 'observable-type-ipv4' }),
      makeObservable({ id: 'obs-3', typeKey: 'observable-type-url' }),
    ];

    emitObservablesAddedEvent(clientArgs, theCase, observables);

    expect(clientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledWith(clientArgs.request, {
      caseId: 'case-1',
      owner: 'securitySolution',
      observableIds: ['obs-1', 'obs-2', 'obs-3'],
      // index-aligned: observableTypeKeys[i] is the type of observableIds[i]; repeats are preserved
      observableTypeKeys: ['observable-type-url', 'observable-type-ipv4', 'observable-type-url'],
    });

    const [[, payload]] = (clientArgs.casesEventBus.emitObservablesAdded as jest.Mock).mock.calls;
    expect(payload.observableIds.length).toBe(payload.observableTypeKeys.length);
  });

  it('emits a single observable correctly', () => {
    const clientArgs = createCasesClientMockArgs();
    const theCase = makeCase();
    const observables = [makeObservable()];

    emitObservablesAddedEvent(clientArgs, theCase, observables);

    expect(clientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledWith(clientArgs.request, {
      caseId: 'case-1',
      owner: 'securitySolution',
      observableIds: ['obs-1'],
      observableTypeKeys: ['observable-type-ipv4'],
    });
  });

  it('does not include value or description in the payload', () => {
    const clientArgs = createCasesClientMockArgs();
    const theCase = makeCase();
    emitObservablesAddedEvent(clientArgs, theCase, [makeObservable()]);

    const [[, payload]] = (clientArgs.casesEventBus.emitObservablesAdded as jest.Mock).mock.calls;

    expect(payload).not.toHaveProperty('value');
    expect(payload).not.toHaveProperty('description');
    expect(payload).not.toHaveProperty('observables');
  });

  it('uses the case owner from the SO attributes', () => {
    const clientArgs = createCasesClientMockArgs();
    const theCase = makeCase('case-2', 'observability');
    emitObservablesAddedEvent(clientArgs, theCase, [makeObservable()]);

    expect(clientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledWith(
      clientArgs.request,
      expect.objectContaining({ owner: 'observability', caseId: 'case-2' })
    );
  });
});
