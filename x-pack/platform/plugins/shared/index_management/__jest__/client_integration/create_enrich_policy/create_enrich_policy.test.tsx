/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { screen, waitFor, act } from '@testing-library/react';

import { setupEnvironment } from '../helpers';
import {
  getMatchingIndices,
  getFieldsFromIndices,
  getMatchingDataStreams,
} from '../helpers/fixtures';
import { renderCreateEnrichPolicy } from '../helpers/render_create_enrich_policy';
import {
  createCreateEnrichPolicyActions,
  exists,
} from '../helpers/actions/enrich_policies_actions';
import { getESPolicyCreationApiCall } from '../../../common/lib';

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.jsonContent);
        }}
      />
    ),
  };
});

const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
const actions = createCreateEnrichPolicyActions();

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  httpRequestsMockHelpers.setGetMatchingIndices(getMatchingIndices());
  httpRequestsMockHelpers.setGetMatchingDataStreams(getMatchingDataStreams());
});

describe('Create enrich policy', () => {
  test('Has header and docs link', async () => {
    renderCreateEnrichPolicy(httpSetup);

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    await screen.findByTestId('configurationForm');

    expect(exists('createEnrichPolicyHeaderContent')).toBe(true);
    expect(exists('createEnrichPolicyDocumentationLink')).toBe(true);
  });

  describe('Configuration step', () => {
    it('Fields have helpers', async () => {
      renderCreateEnrichPolicy(httpSetup);

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      await screen.findByTestId('configurationForm');

      expect(exists('typePopoverIcon')).toBe(true);
      expect(exists('uploadFileLink')).toBe(true);
      expect(exists('matchAllQueryLink')).toBe(true);
    });

    it('shows validation errors if form isnt filled', async () => {
      renderCreateEnrichPolicy(httpSetup);

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      await screen.findByTestId('configurationForm');

      await actions.clickNextButton();

      await waitFor(() => {
        const errors = actions.getErrorsMessages();
        expect(errors.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('Allows to submit the form when fields are filled', async () => {
      httpRequestsMockHelpers.setGetFieldsFromIndices(getFieldsFromIndices());

      renderCreateEnrichPolicy(httpSetup);

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      await screen.findByTestId('configurationForm');

      await actions.completeConfigurationStep({});

      await waitFor(() => {
        expect(actions.isOnFieldSelectionStep()).toBe(true);
      });
    });
  });

  describe('Fields selection step', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetFieldsFromIndices(getFieldsFromIndices());
    });

    it('shows validation errors if form isnt filled', async () => {
      renderCreateEnrichPolicy(httpSetup);

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      await screen.findByTestId('configurationForm');

      await actions.completeConfigurationStep({});

      await waitFor(() => {
        expect(actions.isOnFieldSelectionStep()).toBe(true);
      });

      await actions.clickNextButton();

      await waitFor(() => {
        const errors = actions.getErrorsMessages();
        expect(errors.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('Allows to submit the form when fields are filled', async () => {
      renderCreateEnrichPolicy(httpSetup);

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      await screen.findByTestId('configurationForm');

      await actions.completeConfigurationStep({});

      await waitFor(() => {
        expect(actions.isOnFieldSelectionStep()).toBe(true);
      });

      await actions.completeFieldsSelectionStep();

      await waitFor(() => {
        expect(actions.isOnCreateStep()).toBe(true);
      });
    });

    it('When no common fields are returned it shows an error callout', async () => {
      httpRequestsMockHelpers.setGetFieldsFromIndices({
        commonFields: [],
        indices: [],
      });

      renderCreateEnrichPolicy(httpSetup);
      await screen.findByTestId('configurationForm');

      await actions.completeConfigurationStep({ indices: 'test-1, test-2' });

      await waitFor(() => {
        expect(exists('noCommonFieldsError')).toBe(true);
      });
    });
  });

  describe('Creation step', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetFieldsFromIndices(getFieldsFromIndices());
    });

    it('Shows CTAs for creating the policy', async () => {
      renderCreateEnrichPolicy(httpSetup);
      await screen.findByTestId('configurationForm');

      await actions.completeConfigurationStep({});
      await waitFor(() => {
        expect(actions.isOnFieldSelectionStep()).toBe(true);
      });

      await actions.completeFieldsSelectionStep();
      await waitFor(() => {
        expect(actions.isOnCreateStep()).toBe(true);
      });

      expect(exists('createButton')).toBe(true);
      expect(exists('createAndExecuteButton')).toBe(true);
    });

    it('Shows policy summary and request', async () => {
      renderCreateEnrichPolicy(httpSetup);
      await screen.findByTestId('configurationForm');

      await actions.completeConfigurationStep({});
      await waitFor(() => {
        expect(actions.isOnFieldSelectionStep()).toBe(true);
      });

      await actions.completeFieldsSelectionStep();
      await waitFor(() => {
        expect(actions.isOnCreateStep()).toBe(true);
      });

      expect(screen.getByTestId('enrichPolicySummaryList').textContent).toContain('test_policy');

      await actions.clickRequestTab();

      await waitFor(() => {
        expect(screen.getByTestId('requestBody').textContent).toContain(
          getESPolicyCreationApiCall('test_policy')
        );
      });
    });

    it('Shows error message when creating the policy fails', async () => {
      renderCreateEnrichPolicy(httpSetup);
      await screen.findByTestId('configurationForm');

      await actions.completeConfigurationStep({});
      await waitFor(() => {
        expect(actions.isOnFieldSelectionStep()).toBe(true);
      });

      await actions.completeFieldsSelectionStep();
      await waitFor(() => {
        expect(actions.isOnCreateStep()).toBe(true);
      });

      const error = {
        statusCode: 400,
        error: 'Bad Request',
        message: 'something went wrong...',
      };

      httpRequestsMockHelpers.setCreateEnrichPolicy(undefined, error);

      await actions.clickCreatePolicy();

      await waitFor(() => {
        expect(exists('errorWhenCreatingCallout')).toBe(true);
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetFieldsFromIndices(getFieldsFromIndices());
    });

    it('Can navigate back and forth with next/back buttons', async () => {
      renderCreateEnrichPolicy(httpSetup);
      await screen.findByTestId('configurationForm');

      // Navigate to create step
      await actions.completeConfigurationStep({});
      await waitFor(() => {
        expect(actions.isOnFieldSelectionStep()).toBe(true);
      });

      await actions.completeFieldsSelectionStep();
      await waitFor(() => {
        expect(actions.isOnCreateStep()).toBe(true);
      });

      // Clicking back button should take us to fields selection step
      await actions.clickBackButton();
      await waitFor(() => {
        expect(actions.isOnFieldSelectionStep()).toBe(true);
      });

      // Clicking back button should take us to configuration step
      await actions.clickBackButton();
      await waitFor(() => {
        expect(actions.isOnConfigurationStep()).toBe(true);
      });
    });
  });
});
