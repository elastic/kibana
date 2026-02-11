/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';
import { setupEnvironment } from '../../helpers/setup_environment';
import { renderEditPolicy } from '../../helpers/render_edit_policy';
import { getDefaultHotPhasePolicy, POLICY_NAME, POLICY_MANAGED_BY_ES } from '../constants';

describe('<EditPolicy /> edit warning', () => {
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

  describe('when loading a new policy', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();
      httpRequestsMockHelpers.setLoadPolicies([]);
      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');
    });

    test('no edit warning for a new policy', () => {
      expect(screen.queryByTestId('editWarning')).not.toBeInTheDocument();
    });
  });

  describe('when loading an existing policy', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy(POLICY_NAME)]);
      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');
    });

    test('an edit warning is shown for an existing policy', () => {
      expect(screen.getByTestId('editWarning')).toBeInTheDocument();
    });
  });

  describe('when loading a managed policy', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();
      httpRequestsMockHelpers.setLoadPolicies([POLICY_MANAGED_BY_ES]);
      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');
    });

    test('an edit warning callout is shown for an existing, managed policy', () => {
      expect(screen.getByTestId('editWarning')).toBeInTheDocument();
      expect(screen.getByTestId('editManagedPolicyCallOut')).toBeInTheDocument();
    });

    test('an edit warning callout is shown for a deprecated policy', () => {
      expect(screen.getByTestId('editWarning')).toBeInTheDocument();
      expect(screen.getByTestId('editPolicyWithDeprecation')).toBeInTheDocument();
    });
  });

  describe('when policy has no indices', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();
      httpRequestsMockHelpers.setLoadPolicies([
        { ...getDefaultHotPhasePolicy(POLICY_NAME), indices: [] },
      ]);
      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');
    });

    test('no indices link if no indices', () => {
      expect(screen.queryByTestId('linkedIndicesLink')).not.toBeInTheDocument();
    });
  });

  describe('when policy has no index templates', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();
      httpRequestsMockHelpers.setLoadPolicies([
        { ...getDefaultHotPhasePolicy(POLICY_NAME), indexTemplates: [] },
      ]);
      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');
    });

    test('no index templates link if no index templates', () => {
      expect(screen.queryByTestId('linkedIndexTemplatesLink')).not.toBeInTheDocument();
    });
  });

  describe('when policy has indices', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();
      httpRequestsMockHelpers.setLoadPolicies([
        {
          ...getDefaultHotPhasePolicy(POLICY_NAME),
          indices: ['index1', 'index2', 'index3'],
        },
      ]);
      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');
    });

    test('index templates link has number of indices', () => {
      expect(screen.getByTestId('linkedIndicesLink')).toHaveTextContent('3 linked indices');
    });
  });

  describe('when policy has index templates', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();
      httpRequestsMockHelpers.setLoadPolicies([
        {
          ...getDefaultHotPhasePolicy(POLICY_NAME),
          indexTemplates: ['template1', 'template2', 'template3'],
        },
      ]);
      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');
    });

    test('index templates link has number of index templates', () => {
      expect(screen.getByTestId('linkedIndexTemplatesLink')).toHaveTextContent(
        '3 linked index templates'
      );
    });
  });

  describe('index templates flyout', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();
      httpRequestsMockHelpers.setLoadPolicies([
        {
          ...getDefaultHotPhasePolicy(POLICY_NAME),
          indexTemplates: ['template1'],
        },
      ]);
      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');
    });

    test('index templates link opens the flyout', () => {
      expect(screen.queryByTestId('indexTemplatesFlyoutHeader')).not.toBeInTheDocument();

      const link = screen.getByTestId('linkedIndexTemplatesLink');
      fireEvent.click(link);

      expect(screen.getByTestId('indexTemplatesFlyoutHeader')).toBeInTheDocument();
    });
  });
});
