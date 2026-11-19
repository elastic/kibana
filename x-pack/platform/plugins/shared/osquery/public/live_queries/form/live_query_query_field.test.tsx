/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { useForm, FormProvider } from 'react-hook-form';

import type { LiveQueryFormFields } from '.';
import type { OsqueryCapabilities } from '../../__test_helpers__/create_mock_kibana_services';
import { ROLE_CAPABILITIES } from '../../__test_helpers__/create_mock_kibana_services';

const mockUseKibana = jest.fn();

jest.mock('../../common/lib/kibana', () => ({
  ...jest.requireActual('../../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
}));

jest.mock('../../editor', () => ({
  OsqueryEditor: ({ defaultValue }: { defaultValue: string }) => (
    <div data-test-subj="osqueryEditor">{defaultValue}</div>
  ),
}));

jest.mock('../../packs/queries/lazy_ecs_mapping_editor_field', () => ({
  ECSMappingEditorField: () => <div data-test-subj="ecsMappingEditor">ECS Mapping</div>,
}));

jest.mock('../../saved_queries/saved_queries_dropdown', () => ({
  SavedQueriesDropdown: () => <div data-test-subj="savedQueriesDropdown">Saved Queries</div>,
}));

jest.mock('../../form/timeout_field', () => ({
  TimeoutField: () => <div data-test-subj="timeoutField">Timeout</div>,
}));

const setupKibana = (capabilities: Partial<OsqueryCapabilities> = {}) => {
  const osqueryCapabilities = {
    ...ROLE_CAPABILITIES.admin,
    ...capabilities,
  };

  mockUseKibana.mockReturnValue({
    services: {
      application: {
        capabilities: {
          osquery: osqueryCapabilities,
        },
      },
    },
  });
};

const FormWrapper: React.FC<{
  children: React.ReactNode;
  defaultValues?: Partial<LiveQueryFormFields>;
}> = ({ children, defaultValues }) => {
  const methods = useForm<LiveQueryFormFields>({
    defaultValues: {
      queryType: 'query',
      query: '',
      ecs_mapping: {},
      ...defaultValues,
    },
  });

  return (
    <EuiProvider>
      <IntlProvider locale="en">
        <FormProvider {...methods}>{children}</FormProvider>
      </IntlProvider>
    </EuiProvider>
  );
};

// Import after all mocks are registered (jest.mock is hoisted above imports by babel-jest)
import LiveQueryQueryField from './live_query_query_field';

describe('LiveQueryQueryField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupKibana();
  });

  describe('Advanced accordion', () => {
    it('should render the Advanced accordion for admin role', () => {
      render(
        <FormWrapper>
          <LiveQueryQueryField />
        </FormWrapper>
      );

      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    it('should hide the Advanced accordion for reader role', () => {
      setupKibana(ROLE_CAPABILITIES.reader);

      render(
        <FormWrapper>
          <LiveQueryQueryField />
        </FormWrapper>
      );

      expect(screen.queryByText('Advanced')).not.toBeInTheDocument();
    });

    it('should show the Advanced accordion for t1_analyst role', () => {
      setupKibana(ROLE_CAPABILITIES.t1_analyst);

      render(
        <FormWrapper>
          <LiveQueryQueryField />
        </FormWrapper>
      );

      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    it('should start with accordion closed when no ECS mapping exists', () => {
      render(
        <FormWrapper>
          <LiveQueryQueryField />
        </FormWrapper>
      );

      expect(screen.queryByTestId('ecsMappingEditor')).not.toBeVisible();
    });

    it('should toggle accordion open on click', () => {
      render(
        <FormWrapper>
          <LiveQueryQueryField />
        </FormWrapper>
      );

      fireEvent.click(screen.getByText('Advanced'));

      expect(screen.getByTestId('ecsMappingEditor')).toBeVisible();
      expect(screen.getByTestId('timeoutField')).toBeVisible();
    });

    it('should toggle accordion closed after opening', () => {
      render(
        <FormWrapper>
          <LiveQueryQueryField />
        </FormWrapper>
      );

      // Open
      fireEvent.click(screen.getByText('Advanced'));
      expect(screen.getByTestId('ecsMappingEditor')).toBeVisible();

      // Close
      fireEvent.click(screen.getByText('Advanced'));
      expect(screen.queryByTestId('ecsMappingEditor')).not.toBeVisible();
    });
  });

  describe('query editor', () => {
    it('should render the osquery editor for admin role', () => {
      render(
        <FormWrapper>
          <LiveQueryQueryField />
        </FormWrapper>
      );

      expect(screen.getByTestId('osqueryEditor')).toBeInTheDocument();
    });

    it('should render a read-only code block for reader role', () => {
      setupKibana(ROLE_CAPABILITIES.reader);

      render(
        <FormWrapper defaultValues={{ query: 'SELECT * FROM uptime' }}>
          <LiveQueryQueryField />
        </FormWrapper>
      );

      expect(screen.queryByTestId('osqueryEditor')).not.toBeInTheDocument();
    });
  });

  describe('saved queries dropdown', () => {
    it('should render saved queries dropdown when user has runSavedQueries permission', () => {
      render(
        <FormWrapper>
          <LiveQueryQueryField />
        </FormWrapper>
      );

      expect(screen.getByTestId('savedQueriesDropdown')).toBeInTheDocument();
    });

    it('should not render saved queries dropdown for reader role', () => {
      setupKibana(ROLE_CAPABILITIES.reader);

      render(
        <FormWrapper>
          <LiveQueryQueryField />
        </FormWrapper>
      );

      expect(screen.queryByTestId('savedQueriesDropdown')).not.toBeInTheDocument();
    });
  });
});
