/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { makeDefaultServices } from '../mocks';
import { redirectToDashboard } from './save_modal_container_helpers';
import type { LensSerializedState } from '..';
import type { LensAppServices } from '@kbn/lens-common';

describe('redirectToDashboard', () => {
  const embeddableInput = {
    test: 'test',
  } as unknown as LensSerializedState;
  const mockServices = makeDefaultServices();

  it('should call the navigateToWithEmbeddablePackages with the correct args if originatingApp is given', () => {
    const navigateToWithEmbeddablePackagesSpy = jest.fn();
    const transferService = {
      ...mockServices.stateTransfer,
      navigateToWithEmbeddablePackages: navigateToWithEmbeddablePackagesSpy,
    } as unknown as LensAppServices['stateTransfer'];
    redirectToDashboard({
      embeddableInput,
      dashboardId: 'id',
      originatingApp: 'security',
      getOriginatingPath: jest.fn(),
      stateTransfer: transferService,
    });
    expect(navigateToWithEmbeddablePackagesSpy).toHaveBeenCalledWith('security', {
      path: '#/view/id',
      state: [{ serializedState: { test: 'test' }, type: 'lens' }],
    });
  });

  it('should call the navigateToWithEmbeddablePackages with the correct args if originatingApp is an empty string', () => {
    const navigateToWithEmbeddablePackagesSpy = jest.fn();
    const transferService = {
      ...mockServices.stateTransfer,
      navigateToWithEmbeddablePackages: navigateToWithEmbeddablePackagesSpy,
    } as unknown as LensAppServices['stateTransfer'];
    redirectToDashboard({
      embeddableInput,
      dashboardId: 'id',
      originatingApp: '',
      getOriginatingPath: jest.fn(),
      stateTransfer: transferService,
    });
    expect(navigateToWithEmbeddablePackagesSpy).toHaveBeenCalledWith('dashboards', {
      path: '#/view/id',
      state: [{ serializedState: { test: 'test' }, type: 'lens' }],
    });
  });
});
