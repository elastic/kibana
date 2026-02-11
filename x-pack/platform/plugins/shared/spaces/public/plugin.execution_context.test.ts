/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';

import { SpacesPlugin } from './plugin';
import { spacesManagerMock } from './spaces_manager/mocks';

const mockActiveSpace$ = new BehaviorSubject({ id: 'default', name: 'Default' });
const mockSpacesManager = spacesManagerMock.create();

jest.mock('./spaces_manager', () => ({
  SpacesManager: jest.fn().mockImplementation(() => ({
    ...mockSpacesManager,
    onActiveSpaceChange$: mockActiveSpace$.asObservable(),
  })),
}));

describe('Spaces plugin - execution context synchronization', () => {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const executionContext$ = new BehaviorSubject({});

  coreSetup.executionContext.context$ = executionContext$.asObservable();

  const plugin = new SpacesPlugin(
    coreMock.createPluginInitializerContext({ allowSolutionVisibility: true })
  );

  plugin.setup(coreSetup, {});
  plugin.start(coreStart);

  beforeEach(() => {
    // Reset observable values
    mockActiveSpace$.next({ id: 'default', name: 'Default' });
    executionContext$.next({ space: 'default' });

    // Clear execution context set calls so tests are cleaner
    coreSetup.executionContext.set.mockClear();
  });

  it('should sync space ID to execution context when active space changes', () => {
    mockActiveSpace$.next({ id: 'marketing', name: 'Marketing' });
    expect(coreSetup.executionContext.set).toHaveBeenCalledWith({ space: 'marketing' });
  });

  it('should sync space ID to execution context if the execution context is cleared', () => {
    executionContext$.next({ app: 'dashboard' });
    expect(coreSetup.executionContext.set).toHaveBeenCalledWith({ space: 'default' });
  });

  it('should not update execution context if space ID is already synced', () => {
    mockActiveSpace$.next({ id: 'default', name: 'Default' });
    expect(coreSetup.executionContext.set).not.toHaveBeenCalled();
  });

  it('should handle multiple space changes', () => {
    mockActiveSpace$.next({ id: 'space1', name: 'Space 1' });
    mockActiveSpace$.next({ id: 'space2', name: 'Space 2' });
    mockActiveSpace$.next({ id: 'space3', name: 'Space 3' });

    expect(coreSetup.executionContext.set).toHaveBeenCalledTimes(3);
    expect(coreSetup.executionContext.set).toHaveBeenNthCalledWith(1, { space: 'space1' });
    expect(coreSetup.executionContext.set).toHaveBeenNthCalledWith(2, { space: 'space2' });
    expect(coreSetup.executionContext.set).toHaveBeenNthCalledWith(3, { space: 'space3' });
  });

  it('should unsubscribe from execution context sync on plugin stop', () => {
    plugin.stop();

    mockActiveSpace$.next({ id: 'should-not-sync', name: 'Should Not Sync' });

    expect(coreSetup.executionContext.set).not.toHaveBeenCalled();
  });
});
