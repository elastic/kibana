/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from '../../../common/types/domain';
import { createCasesClientMockArgs } from '../mocks';
import { emitObservablesAddedEvent } from './observables_trigger_utils';
import type { CaseSavedObjectTransformed } from '../../common/types/case';

const makeCase = (id = 'case-1', owner = 'securitySolution') =>
  ({
    id,
    attributes: { owner },
  }) as unknown as CaseSavedObjectTransformed;

const makeObservable = (
  overrides: Partial<Observable> = {}
): Observable => ({
  id: 'obs-1',
  typeKey: 'ip',
  value: '1.2.3.4',
  description: 'test description',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: null,
  ...overrides,
});

describe('emitObservablesAddedEvent', () => {
  it('emits observablesAdded with the correct payload', () => {
    const clientArgs = createCasesClientMockArgs();
    const theCase = makeCase();
    const observables = [makeObservable()];

    emitObservablesAddedEvent(clientArgs, theCase, observables);

    expect(clientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledWith(
      clientArgs.request,
      {
        caseId: 'case-1',
        owner: 'securitySolution',
        observables: [
          {
            id: 'obs-1',
            typeKey: 'ip',
            value: '1.2.3.4',
            description: 'test description',
          },
        ],
      }
    );
  });

  it('maps undefined description to null', () => {
    const clientArgs = createCasesClientMockArgs();
    const theCase = makeCase();
    const observables = [makeObservable({ description: undefined })];

    emitObservablesAddedEvent(clientArgs, theCase, observables);

    expect(clientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledWith(
      clientArgs.request,
      expect.objectContaining({
        observables: [expect.objectContaining({ description: null })],
      })
    );
  });

  it('maps null description to null', () => {
    const clientArgs = createCasesClientMockArgs();
    const theCase = makeCase();
    const observables = [makeObservable({ description: null })];

    emitObservablesAddedEvent(clientArgs, theCase, observables);

    expect(clientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledWith(
      clientArgs.request,
      expect.objectContaining({
        observables: [expect.objectContaining({ description: null })],
      })
    );
  });

  it('emits with multiple observables', () => {
    const clientArgs = createCasesClientMockArgs();
    const theCase = makeCase();
    const observables = [
      makeObservable({ id: 'obs-1', typeKey: 'ip', value: '1.2.3.4' }),
      makeObservable({ id: 'obs-2', typeKey: 'hash.md5', value: 'abc123', description: null }),
    ];

    emitObservablesAddedEvent(clientArgs, theCase, observables);

    expect(clientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledWith(
      clientArgs.request,
      {
        caseId: 'case-1',
        owner: 'securitySolution',
        observables: [
          { id: 'obs-1', typeKey: 'ip', value: '1.2.3.4', description: 'test description' },
          { id: 'obs-2', typeKey: 'hash.md5', value: 'abc123', description: null },
        ],
      }
    );
  });
});
