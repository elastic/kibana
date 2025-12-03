/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import type { HttpSetup } from '@kbn/core/public';
import { Provider } from 'react-redux';

import { setupEnvironment } from '../helpers';
import {
  getMatchingIndices,
  getFieldsFromIndices,
  getMatchingDataStreams,
} from '../helpers/fixtures';
import { getESPolicyCreationApiCall } from '../../../common/lib';
import { EnrichPolicyCreate } from '../../../public/application/sections/enrich_policy_create';
import { indexManagementStore } from '../../../public/application/store';
import { WithAppDependencies, services } from '../helpers/setup_environment';

jest.useFakeTimers();

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

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // Mock EuiComboBox as a simple input instead so that its easier to test
    EuiComboBox: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockEuiCombobox'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.target.value.split(', '));
        }}
      />
    ),
  };
});

/**
 * Render the EnrichPolicyCreate component with all necessary context.
 */
const renderCreateEnrichPolicy = (httpSetup: HttpSetup, overridingDependencies: any = {}) => {
  const store = indexManagementStore(services as any);

  const CreateEnrichPolicyWithRouter = () => (
    <MemoryRouter initialEntries={['/enrich_policies/create']}>
      <Route path="/:section(enrich_policies)/create">
        <EnrichPolicyCreate />
      </Route>
    </MemoryRouter>
  );

  return render(
    <Provider store={store}>
      {React.createElement(
        WithAppDependencies(CreateEnrichPolicyWithRouter, httpSetup, overridingDependencies)
      )}
    </Provider>
  );
};

/**
 * Helper to check if an element exists.
 */
const exists = (testId: string): boolean => {
  return screen.queryByTestId(testId) !== null;
};

/**
 * Actions for interacting with the create enrich policy form.
 */
const createActions = () => {
  const clickNextButton = async () => {
    fireEvent.click(screen.getByTestId('nextButton'));
  };

  const clickBackButton = async () => {
    fireEvent.click(screen.getByTestId('backButton'));
  };

  const clickRequestTab = async () => {
    fireEvent.click(screen.getByTestId('requestTab'));
  };

  const clickCreatePolicy = async () => {
    fireEvent.click(screen.getByTestId('createButton'));
  };

  const isOnConfigurationStep = (): boolean => {
    return exists('configurationForm');
  };

  const isOnFieldSelectionStep = (): boolean => {
    return exists('fieldSelectionForm');
  };

  const isOnCreateStep = (): boolean => {
    return exists('creationStep');
  };

  const completeConfigurationStep = async ({ indices }: { indices?: string } = {}) => {
    // Fill in policy name
    const nameInput = screen.getByTestId('policyNameField').querySelector('input');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'test_policy' } });
    }

    // Set policy type
    const typeSelect = screen.getByTestId('policyTypeField');
    fireEvent.change(typeSelect, { target: { value: 'match' } });

    // Set source indices
    const indicesSelect = screen.getByTestId('policySourceIndicesField');
    fireEvent.change(indicesSelect, { target: { value: indices ?? 'test-1' } });

    await clickNextButton();
  };

  const completeFieldsSelectionStep = async () => {
    // Set match field
    const matchFieldSelect = screen.getByTestId('matchField');
    fireEvent.change(matchFieldSelect, { target: { value: 'name' } });

    // Set enrich fields
    const enrichFieldsSelect = screen.getByTestId('enrichFields');
    fireEvent.change(enrichFieldsSelect, { target: { value: 'email' } });

    await clickNextButton();
  };

  const getErrorsMessages = (): string[] => {
    const errors = screen.queryAllByText((content, element) => {
      return (
        element?.classList.contains('euiFormErrorText') ||
        element?.getAttribute('class')?.includes('euiFormErrorText') ||
        false
      );
    });
    return errors.map((el) => el.textContent || '');
  };

  return {
    clickNextButton,
    clickBackButton,
    clickRequestTab,
    clickCreatePolicy,
    isOnConfigurationStep,
    isOnFieldSelectionStep,
    isOnCreateStep,
    completeConfigurationStep,
    completeFieldsSelectionStep,
    getErrorsMessages,
  };
};

describe('Create enrich policy', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  const actions = createActions();

  beforeEach(() => {
    httpRequestsMockHelpers.setGetMatchingIndices(getMatchingIndices());
    httpRequestsMockHelpers.setGetMatchingDataStreams(getMatchingDataStreams());
  });

  test('Has header and docs link', async () => {
    renderCreateEnrichPolicy(httpSetup);
    await screen.findByTestId('configurationForm');

    expect(exists('createEnrichPolicyHeaderContent')).toBe(true);
    expect(exists('createEnrichPolicyDocumentationLink')).toBe(true);
  });

  describe('Configuration step', () => {
    it('Fields have helpers', async () => {
      renderCreateEnrichPolicy(httpSetup);
      await screen.findByTestId('configurationForm');

      expect(exists('typePopoverIcon')).toBe(true);
      expect(exists('uploadFileLink')).toBe(true);
      expect(exists('matchAllQueryLink')).toBe(true);
    });

    it('shows validation errors if form isnt filled', async () => {
      renderCreateEnrichPolicy(httpSetup);
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
      await screen.findByTestId('configurationForm');

      await actions.completeConfigurationStep({});

      await waitFor(() => {
        expect(actions.isOnFieldSelectionStep()).toBe(true);
      });

      // Set match field
      const matchFieldSelect = screen.getByTestId('matchField');
      fireEvent.change(matchFieldSelect, { target: { value: 'name' } });

      // Set enrich fields
      const enrichFieldsSelect = screen.getByTestId('enrichFields');
      fireEvent.change(enrichFieldsSelect, { target: { value: 'email' } });

      await actions.clickNextButton();

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
