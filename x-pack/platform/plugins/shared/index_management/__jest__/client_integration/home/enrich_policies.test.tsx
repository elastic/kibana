/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import { notificationServiceMock } from '@kbn/core/public/mocks';

import { setupEnvironment } from '../helpers/setup_environment';
import { renderHome } from '../helpers/render_home';
import { createTestEnrichPolicy } from '../helpers/fixtures';
import {
  createEnrichPoliciesActions,
  getEnrichPoliciesTableRowCount,
} from '../helpers/actions/enrich_policies_actions';
import { notificationService } from '../../../public/application/services/notification';

jest.mock('@kbn/code-editor');

describe('Enrich policies tab', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let setDelayResponse: ReturnType<typeof setupEnvironment>['setDelayResponse'];

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    const mockEnvironment = setupEnvironment();
    httpSetup = mockEnvironment.httpSetup;
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    setDelayResponse = mockEnvironment.setDelayResponse;
  });

  describe('empty states', () => {
    beforeEach(async () => {
      setDelayResponse(false);
    });

    test('displays a loading prompt', async () => {
      setDelayResponse(true);
      httpRequestsMockHelpers.setLoadEnrichPoliciesResponse([]);

      await renderHome(httpSetup, {
        initialEntries: ['/enrich_policies'],
      });

      expect(await screen.findByTestId('sectionLoading')).toBeInTheDocument();
    });

    test('displays a error prompt', async () => {
      const error = {
        statusCode: 400,
        error: 'Bad Request',
        message: 'something went wrong...',
      };

      httpRequestsMockHelpers.setLoadEnrichPoliciesResponse(undefined, error);

      await renderHome(httpSetup, {
        initialEntries: ['/enrich_policies'],
      });

      await screen.findByTestId('sectionError');
      expect(screen.getByTestId('sectionError')).toBeInTheDocument();
    });
  });

  describe('policies list', () => {
    let testPolicy: ReturnType<typeof createTestEnrichPolicy>;

    beforeEach(async () => {
      setDelayResponse(false);
      testPolicy = createTestEnrichPolicy('policy-match', 'match');

      httpRequestsMockHelpers.setLoadEnrichPoliciesResponse([
        testPolicy,
        createTestEnrichPolicy('policy-range', 'range'),
      ]);
    });

    it('shows enrich policies in table', async () => {
      await renderHome(httpSetup, {
        initialEntries: ['/enrich_policies'],
      });

      await screen.findByTestId('enrichPoliciesTable');
      expect(getEnrichPoliciesTableRowCount()).toBe(2);
    });

    it('can reload the table data through a call to action', async () => {
      await renderHome(httpSetup, {
        initialEntries: ['/enrich_policies'],
      });

      await screen.findByTestId('enrichPoliciesTable');
      const actions = createEnrichPoliciesActions();

      const requestsBefore = jest.mocked(httpSetup.get).mock.calls.length;

      actions.clickReloadPoliciesButton();

      // Should have made a call to load the policies after the reload
      // button is clicked.
      await waitFor(() => {
        expect(jest.mocked(httpSetup.get).mock.calls.length).toBeGreaterThan(requestsBefore);
      });
    });

    describe('details flyout', () => {
      it('can open the details flyout', async () => {
        // Navigate directly to the policy details URL since link click doesn't trigger router navigation in RTL
        await renderHome(httpSetup, {
          initialEntries: ['/enrich_policies?policy=policy-match'],
        });

        await screen.findByTestId('policyDetailsFlyout');
        expect(screen.getByTestId('policyDetailsFlyout')).toBeInTheDocument();
      });

      it('contains all the necessary policy fields', async () => {
        // Navigate directly to the policy details URL
        await renderHome(httpSetup, {
          initialEntries: ['/enrich_policies?policy=policy-match'],
        });

        await screen.findByTestId('policyDetailsFlyout');

        expect(screen.getByTestId('policyTypeValue')).toHaveTextContent(testPolicy.type);
        expect(screen.getByTestId('policyIndicesValue')).toHaveTextContent(
          testPolicy.sourceIndices.join(', ')
        );
        expect(screen.getByTestId('policyMatchFieldValue')).toHaveTextContent(
          testPolicy.matchField
        );
        expect(screen.getByTestId('policyEnrichFieldsValue')).toHaveTextContent(
          testPolicy.enrichFields.join(', ')
        );

        const codeEditorValue = screen.getByTestId('queryEditor').getAttribute('data-currentvalue');
        expect(JSON.parse(codeEditorValue || '')).toEqual(testPolicy.query);
      });
    });

    describe('policy actions', () => {
      const notificationsServiceMock = notificationServiceMock.createStartContract();

      beforeEach(async () => {
        notificationService.setup(notificationsServiceMock);

        httpRequestsMockHelpers.setLoadEnrichPoliciesResponse([
          createTestEnrichPolicy('policy-match', 'match'),
        ]);
      });

      describe('deletion', () => {
        it('can delete a policy', async () => {
          await renderHome(httpSetup, {
            initialEntries: ['/enrich_policies'],
          });

          await screen.findByTestId('enrichPoliciesTable');
          const actions = createEnrichPoliciesActions();

          httpRequestsMockHelpers.setDeleteEnrichPolicyResponse('policy-match', {
            acknowledged: true,
          });

          await actions.clickDeletePolicyAt(0);

          expect(screen.getByTestId('deletePolicyModal')).toBeInTheDocument();

          await actions.clickConfirmDeletePolicyButton();

          await waitFor(() => {
            expect(notificationsServiceMock.toasts.add).toHaveBeenLastCalledWith(
              expect.objectContaining({
                title: 'Deleted policy-match',
              })
            );
          });
          expect(httpSetup.delete.mock.calls.length).toBe(1);
        });

        test('displays an error toast if it fails', async () => {
          await renderHome(httpSetup, {
            initialEntries: ['/enrich_policies'],
          });

          await screen.findByTestId('enrichPoliciesTable');
          const actions = createEnrichPoliciesActions();

          const error = {
            statusCode: 400,
            error: 'Bad Request',
            message: 'something went wrong...',
          };

          httpRequestsMockHelpers.setDeleteEnrichPolicyResponse('policy-match', undefined, error);

          await actions.clickDeletePolicyAt(0);

          expect(screen.getByTestId('deletePolicyModal')).toBeInTheDocument();

          await actions.clickConfirmDeletePolicyButton();

          await waitFor(() => {
            expect(notificationsServiceMock.toasts.add).toHaveBeenLastCalledWith(
              expect.objectContaining({
                title: `Error deleting enrich policy: 'something went wrong...'`,
              })
            );
          });
        });
      });

      describe('execution', () => {
        it('can execute a policy', async () => {
          await renderHome(httpSetup, {
            initialEntries: ['/enrich_policies'],
          });

          await screen.findByTestId('enrichPoliciesTable');
          const actions = createEnrichPoliciesActions();

          httpRequestsMockHelpers.setExecuteEnrichPolicyResponse('policy-match', {
            acknowledged: true,
          });

          await actions.clickExecutePolicyAt(0);

          expect(screen.getByTestId('executePolicyModal')).toBeInTheDocument();

          await actions.clickConfirmExecutePolicyButton();

          await waitFor(() => {
            expect(notificationsServiceMock.toasts.add).toHaveBeenLastCalledWith(
              expect.objectContaining({
                title: 'Executed policy-match',
              })
            );
          });
          expect(httpSetup.put.mock.calls.length).toBe(1);
        });

        test('displays an error toast if it fails', async () => {
          await renderHome(httpSetup, {
            initialEntries: ['/enrich_policies'],
          });

          await screen.findByTestId('enrichPoliciesTable');
          const actions = createEnrichPoliciesActions();

          const error = {
            statusCode: 400,
            error: 'Bad Request',
            message: 'something went wrong...',
          };

          httpRequestsMockHelpers.setExecuteEnrichPolicyResponse('policy-match', undefined, error);

          await actions.clickExecutePolicyAt(0);

          expect(screen.getByTestId('executePolicyModal')).toBeInTheDocument();

          await actions.clickConfirmExecutePolicyButton();

          await waitFor(() => {
            expect(notificationsServiceMock.toasts.add).toHaveBeenLastCalledWith(
              expect.objectContaining({
                title: `Error executing enrich policy: 'something went wrong...'`,
              })
            );
          });
        });
      });
    });
  });
});
