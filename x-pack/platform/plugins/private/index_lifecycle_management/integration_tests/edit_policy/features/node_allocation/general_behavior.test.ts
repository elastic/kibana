/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within, waitFor, fireEvent } from '@testing-library/react';
import type { HttpFetchOptionsWithPath } from '@kbn/core/public';
import { setupEnvironment } from '../../../helpers/setup_environment';
import { renderEditPolicy } from '../../../helpers/render_edit_policy';
import { createNodeAllocationActions } from '../../../helpers/actions/node_allocation_actions';
import { createFormToggleAndSetValueAction } from '../../../helpers/actions/form_toggle_and_set_value_action';
import {
  POLICY_WITH_MIGRATE_OFF,
  POLICY_WITH_NODE_ATTR_AND_OFF_ALLOCATION,
  POLICY_WITH_NODE_ROLE_ALLOCATION,
} from '../../constants';
import { API_BASE_PATH } from '../../../../common/constants';

describe('<EditPolicy /> node allocation general behavior', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const setup = () => {
    renderEditPolicy(httpSetup);
  };

  describe('data allocation', () => {
    test('setting node_attr based allocation, but not selecting node attribute', async () => {
      httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_MIGRATE_OFF]);
      httpRequestsMockHelpers.setListNodes({
        nodesByRoles: {},
        nodesByAttributes: { test: ['123'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      httpRequestsMockHelpers.setLoadSnapshotPolicies([]);

      setup();

      await screen.findByTestId('savePolicyButton');

      const actions = createNodeAllocationActions('warm');

      await actions.setDataAllocation('node_attrs');
      fireEvent.click(screen.getByTestId('savePolicyButton'));
      await waitFor(() => expect(httpSetup.post).toHaveBeenCalled());

      const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
      const [requestUrl, requestBody] = lastReq;
      const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

      expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
      expect(parsedReqBody.phases.warm.actions.migrate).toEqual({ enabled: false });
    });

    describe('node roles', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_NODE_ROLE_ALLOCATION]);
        httpRequestsMockHelpers.setListNodes({
          isUsingDeprecatedDataRoleConfig: false,
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['123'] },
        });

        setup();
        await screen.findByTestId('savePolicyButton');
      });

      test('detecting use of the recommended allocation type', () => {
        const container = screen.getByTestId('warm-dataTierAllocationControls');
        const selectedDataAllocation = within(container)
          .getByTestId('dataTierSelect')
          .textContent?.replace(/,/g, '')
          .trim();
        expect(selectedDataAllocation).toBe('Use warm nodes (recommended)');
      });

      test('setting replicas serialization', async () => {
        const setReplicas = createFormToggleAndSetValueAction(
          'warm-setReplicasSwitch',
          'warm-selectedReplicaCount'
        );

        await setReplicas('123');
        fireEvent.click(screen.getByTestId('savePolicyButton'));
        await waitFor(() => expect(httpSetup.post).toHaveBeenCalled());

        const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
        const [requestUrl, requestBody] = lastReq;
        const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

        expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
        expect(parsedReqBody.phases.warm.actions).toMatchInlineSnapshot(`
          Object {
            "allocate": Object {
              "number_of_replicas": 123,
            },
          }
        `);
      });
    });

    describe('node attr and none', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_NODE_ATTR_AND_OFF_ALLOCATION]);
        httpRequestsMockHelpers.setListNodes({
          isUsingDeprecatedDataRoleConfig: false,
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['123'] },
        });

        setup();
        await screen.findByTestId('savePolicyButton');
      });

      test('detecting use of the custom allocation type', () => {
        const container = screen.getByTestId('warm-dataTierAllocationControls');
        const textContent = within(container)
          .getByTestId('dataTierSelect')
          .textContent?.replace(/,/g, '')
          .trim();
        expect(textContent).toBe('Custom');
      });

      test('detecting use of the "off" allocation type', () => {
        const container = screen.getByTestId('cold-dataTierAllocationControls');
        expect(within(container).getByTestId('dataTierSelect').textContent).toContain('Off');
      });
    });
  });
});
