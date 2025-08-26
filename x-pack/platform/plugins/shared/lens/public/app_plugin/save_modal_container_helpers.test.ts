/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { makeDefaultServices } from '../mocks';
import type { LensAppServices } from './types';
import { redirectToDashboard } from './save_modal_container_helpers';
import type { LensSerializedState } from '..';

describe('redirectToDashboard', () => {
  const embeddableInput = {
    test: 'test',
  } as unknown as LensSerializedState;
  const mockServices = makeDefaultServices();

  it('should call the navigateToWithMultipleEmbeddablePackage with the correct args if originatingApp is given', () => {
    const navigateToWithMultipleEmbeddablePackageSpy = jest.fn();
    const transferService = {
      ...mockServices.stateTransfer,
      navigateToWithMultipleEmbeddablePackage: navigateToWithMultipleEmbeddablePackageSpy,
    } as unknown as LensAppServices['stateTransfer'];
    redirectToDashboard({
      embeddableInput,
      dashboardId: 'id',
      originatingApp: 'security',
      getOriginatingPath: jest.fn(),
      stateTransfer: transferService,
    });
    expect(navigateToWithMultipleEmbeddablePackageSpy).toHaveBeenCalledWith('security', {
      path: '#/view/id',
      state: [{ serializedState: { rawState: { test: 'test' }, references: [] }, type: 'lens' }],
    });
  });

  it('should call the navigateToWithMultipleEmbeddablePackage with the correct args if originatingApp is an empty string', () => {
    const navigateToWithMultipleEmbeddablePackageSpy = jest.fn();
    const transferService = {
      ...mockServices.stateTransfer,
      navigateToWithMultipleEmbeddablePackage: navigateToWithMultipleEmbeddablePackageSpy,
    } as unknown as LensAppServices['stateTransfer'];
    redirectToDashboard({
      embeddableInput,
      dashboardId: 'id',
      originatingApp: '',
      getOriginatingPath: jest.fn(),
      stateTransfer: transferService,
    });
    expect(navigateToWithMultipleEmbeddablePackageSpy).toHaveBeenCalledWith('dashboards', {
      path: '#/view/id',
      state: [{ serializedState: { rawState: { test: 'test' }, references: [] }, type: 'lens' }],
    });
  });
});
