/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { setupEnvironment } from '../../helpers/setup_environment';
import { renderEditPolicy } from '../../helpers/render_edit_policy';
import { createTogglePhaseAction } from '../../helpers/actions/toggle_phase_action';
import type { ListNodesRouteResponse } from '../../../common/types';

describe('<EditPolicy /> frozen phase', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ httpRequestsMockHelpers, httpSetup } = setupEnvironment());
  });

  describe('on non-enterprise license', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();

      renderEditPolicy(httpSetup, {
        appServicesContext: {
          license: licensingMock.createLicense({ license: { type: 'basic' } }),
        },
      });

      await screen.findByTestId('savePolicyButton');
    });

    test('should not be available', () => {
      expect(screen.queryByTestId('frozen-phase')).not.toBeInTheDocument();
    });
  });

  describe('frozen tier nodes', () => {
    const setup = async (
      nodesByRoles: ListNodesRouteResponse['nodesByRoles'],
      args?: Parameters<typeof renderEditPolicy>[1]
    ) => {
      httpRequestsMockHelpers.setDefaultResponses();
      httpRequestsMockHelpers.setListNodes({
        nodesByRoles,
        nodesByAttributes: {},
        isUsingDeprecatedDataRoleConfig: false,
      });

      renderEditPolicy(httpSetup, args);
      await screen.findByTestId('savePolicyButton');
      await waitFor(() =>
        expect(
          httpSetup.get.mock.calls.some(([path]) => String(path).endsWith('/nodes/list'))
        ).toBe(true)
      );

      await createTogglePhaseAction()('frozen');
      await screen.findByTestId('searchableSnapshotField-frozen');
    };

    test('warns when no node can hold data of the frozen tier', async () => {
      await setup({ data_hot: ['node1'], data_content: ['node1'] });

      expect(await screen.findByTestId('noFrozenNodesNotice')).toBeInTheDocument();
    });

    test('does not warn when a node has the data_frozen role', async () => {
      await setup({ data_hot: ['node1'], data_frozen: ['node2'] });

      expect(screen.queryByTestId('noFrozenNodesNotice')).not.toBeInTheDocument();
    });

    test('does not warn when a node has the generic data role', async () => {
      await setup({ data: ['node1'] });

      expect(screen.queryByTestId('noFrozenNodesNotice')).not.toBeInTheDocument();
    });

    test('does not warn on Cloud', async () => {
      await setup(
        { data_hot: ['node1'] },
        { appServicesContext: { cloud: { ...cloudMock.createSetup(), isCloudEnabled: true } } }
      );

      expect(screen.queryByTestId('noFrozenNodesNotice')).not.toBeInTheDocument();
    });
  });
});
