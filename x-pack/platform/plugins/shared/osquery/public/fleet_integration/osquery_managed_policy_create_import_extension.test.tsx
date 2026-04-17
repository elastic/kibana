/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { EuiProvider } from '@elastic/eui';

import {
  OsqueryManagedPolicyCreateImportExtension,
  configProtectedKeysValidator,
  packConfigFilesValidator,
} from './osquery_managed_policy_create_import_extension';

const mockUseFetchStatus = jest.fn().mockReturnValue({
  loading: false,
  disabled: false,
  permissionDenied: false,
});

jest.mock('./use_fetch_status', () => ({
  useFetchStatus: () => mockUseFetchStatus(),
}));

jest.mock('../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: jest.fn().mockReturnValue('/app/osquery'),
      },
      http: {
        fetch: jest.fn().mockResolvedValue({ results: { total: 0 } }),
      },
    },
  }),
}));

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: () => <div data-test-subj="code-editor-mock" />,
  CodeEditorField: () => <div data-test-subj="code-editor-field-mock" />,
}));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });

const renderWithProviders = (element: React.ReactElement) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <QueryClientProvider client={createTestQueryClient()}>{element}</QueryClientProvider>
      </IntlProvider>
    </EuiProvider>
  );

const createNewPolicy = (overrides = {}) => ({
  name: 'osquery_manager-1',
  description: '',
  namespace: 'default',
  enabled: true,
  inputs: [
    {
      type: 'osquery',
      enabled: true,
      streams: [],
      policy_template: 'osquery_manager',
    },
  ],
  package: {
    name: 'osquery_manager',
    title: 'Osquery Manager',
    version: '1.12.0',
  },
  policy_ids: ['agent-policy-1'],
  ...overrides,
});

const createEditPolicy = (overrides = {}) => ({
  ...createNewPolicy(),
  id: 'existing-policy-id',
  revision: 1,
  updated_at: '2024-01-01',
  updated_by: 'elastic',
  created_at: '2024-01-01',
  created_by: 'elastic',
  ...overrides,
});

describe('OsqueryManagedPolicyCreateImportExtension', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchStatus.mockReturnValue({
      loading: false,
      disabled: false,
      permissionDenied: false,
    });
  });

  describe('create mode', () => {
    it('renders the Osquery config accordion', () => {
      renderWithProviders(
        <OsqueryManagedPolicyCreateImportExtension
          onChange={onChange}
          newPolicy={createNewPolicy()}
        />
      );

      expect(screen.getByRole('button', { name: 'Osquery config' })).toBeInTheDocument();
    });

    it('does not render navigation buttons', () => {
      renderWithProviders(
        <OsqueryManagedPolicyCreateImportExtension
          onChange={onChange}
          newPolicy={createNewPolicy()}
        />
      );

      expect(screen.queryByText('Run live queries')).not.toBeInTheDocument();
      expect(screen.queryByText('Packs')).not.toBeInTheDocument();
    });

    it('does not render the disabled callout', () => {
      renderWithProviders(
        <OsqueryManagedPolicyCreateImportExtension
          onChange={onChange}
          newPolicy={createNewPolicy()}
        />
      );

      expect(
        screen.queryByText('Save the integration to access the options below')
      ).not.toBeInTheDocument();
    });

    it('calls onChange with initial policy setup on mount', async () => {
      renderWithProviders(
        <OsqueryManagedPolicyCreateImportExtension
          onChange={onChange}
          newPolicy={createNewPolicy()}
        />
      );

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });
    });
  });

  describe('edit mode', () => {
    it('renders the Osquery config accordion', () => {
      const policy = createEditPolicy();
      renderWithProviders(
        <OsqueryManagedPolicyCreateImportExtension
          onChange={onChange}
          newPolicy={createNewPolicy()}
          policy={policy}
        />
      );

      expect(screen.getByRole('button', { name: 'Osquery config' })).toBeInTheDocument();
    });

    it('does not render navigation buttons', () => {
      const policy = createEditPolicy();
      renderWithProviders(
        <OsqueryManagedPolicyCreateImportExtension
          onChange={onChange}
          newPolicy={createNewPolicy()}
          policy={policy}
        />
      );

      expect(screen.queryByText('Run live queries')).not.toBeInTheDocument();
      expect(screen.queryByText('Packs')).not.toBeInTheDocument();
    });

    it('does not render the disabled callout', () => {
      const policy = createEditPolicy();
      renderWithProviders(
        <OsqueryManagedPolicyCreateImportExtension
          onChange={onChange}
          newPolicy={createNewPolicy()}
          policy={policy}
        />
      );

      expect(
        screen.queryByText('Save the integration to access the options below')
      ).not.toBeInTheDocument();
    });
  });

  describe('permission denied', () => {
    it('hides the config section when permission is denied', () => {
      mockUseFetchStatus.mockReturnValue({
        loading: false,
        disabled: false,
        permissionDenied: true,
      });

      renderWithProviders(
        <OsqueryManagedPolicyCreateImportExtension
          onChange={onChange}
          newPolicy={createNewPolicy()}
        />
      );

      expect(screen.queryByRole('button', { name: 'Osquery config' })).not.toBeInTheDocument();
    });
  });

  describe('accordion content', () => {
    it('shows caution callout, config form and file uploader when expanded', async () => {
      renderWithProviders(
        <OsqueryManagedPolicyCreateImportExtension
          onChange={onChange}
          newPolicy={createNewPolicy()}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Osquery config' }));

      expect(screen.getByText('Proceed with caution')).toBeInTheDocument();
      expect(
        screen.getByText(/Using a custom Osquery package is an advanced configuration/)
      ).toBeInTheDocument();
      expect(screen.getByText('Select or drag and drop osquery config file')).toBeInTheDocument();
      expect(screen.getByText('Example config')).toBeInTheDocument();
    });

    it('renders the accordion with existing config', () => {
      const existingConfig = { packs: { 'my-pack': { queries: {} } } };
      const newPolicy = createNewPolicy({
        inputs: [
          {
            type: 'osquery',
            enabled: true,
            streams: [],
            config: { osquery: { value: existingConfig } },
          },
        ],
      });

      renderWithProviders(
        <OsqueryManagedPolicyCreateImportExtension onChange={onChange} newPolicy={newPolicy} />
      );

      expect(screen.getByRole('button', { name: 'Osquery config' })).toBeInTheDocument();
    });
  });
});

describe('configProtectedKeysValidator', () => {
  const validate = (value: string) =>
    configProtectedKeysValidator({ value, path: 'config', form: {} } as any);

  it('returns undefined for valid config without restricted options', () => {
    expect(validate(JSON.stringify({ packs: {} }))).toBeUndefined();
  });

  it('returns undefined for invalid JSON', () => {
    expect(validate('not valid json')).toBeUndefined();
  });

  it('returns error when config contains restricted options', () => {
    const result = validate(JSON.stringify({ options: { force: true, utc: true } }));
    expect(result).toEqual(
      expect.objectContaining({
        code: 'ERR_RESTRICTED_OPTIONS',
        message: expect.stringContaining('force, utc'),
      })
    );
  });

  it('returns undefined when options object exists but has no restricted keys', () => {
    expect(validate(JSON.stringify({ options: { custom_option: 'value' } }))).toBeUndefined();
  });
});

describe('packConfigFilesValidator', () => {
  const validate = (value: string) =>
    packConfigFilesValidator({ value, path: 'config', form: {} } as any);

  it('returns undefined for valid config with inline pack definitions', () => {
    expect(validate(JSON.stringify({ packs: { 'my-pack': { queries: {} } } }))).toBeUndefined();
  });

  it('returns undefined for invalid JSON', () => {
    expect(validate('not valid json')).toBeUndefined();
  });

  it('returns error when packs reference file paths', () => {
    const result = validate(JSON.stringify({ packs: { 'bad-pack': '/path/to/pack.conf' } }));
    expect(result).toEqual(
      expect.objectContaining({
        code: 'ERR_RESTRICTED_OPTIONS',
        message: expect.stringContaining('bad-pack'),
      })
    );
  });

  it('returns undefined when no packs are defined', () => {
    expect(validate(JSON.stringify({}))).toBeUndefined();
  });
});
