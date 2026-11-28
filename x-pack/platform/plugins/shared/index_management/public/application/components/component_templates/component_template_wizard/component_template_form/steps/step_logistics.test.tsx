/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { StepLogistics } from './step_logistics';

let mockIsServerless = false;

jest.mock('../../../../../app_context', () => ({
  useAppContext: () => ({
    config: { isServerless: mockIsServerless },
    plugins: { cloud: undefined },
    core: {
      application: { capabilities: { management: { stack: { license_management: true } } } },
    },
  }),
}));

jest.mock('../../../component_templates_context', () => ({
  useComponentTemplatesContext: () => ({
    documentation: { componentTemplates: 'https://example.test', componentTemplatesMetadata: '' },
    getUrlForApp: () => 'http://localhost/app/management',
  }),
  useApi: () => ({
    useLoadSnapshotRepositories: () => ({
      data: {
        hasDefaultRepository: true,
        defaultRepository: 'found-snapshots',
        hasRepositories: true,
        canCreateRepository: true,
      },
      resendRequest: jest.fn(),
    }),
  }),
}));

jest.mock('../../../../../../hooks/use_license', () => ({
  useLicense: () => ({ isAtLeastEnterprise: () => true }),
}));

describe('StepLogistics', () => {
  const baseDefaultValue = {
    name: 'my-component-template',
    lifecycle: { enabled: false, value: 1, unit: 'd' },
  };

  beforeEach(() => {
    mockIsServerless = true;
  });

  describe('WHEN editing an existing component template', () => {
    it('SHOULD keep a slash in the name valid when the field is disabled', async () => {
      const onChange = jest.fn();

      render(
        <I18nProvider>
          <StepLogistics
            defaultValue={{ ...baseDefaultValue, name: 'a/b' }}
            isEditing={true}
            onChange={onChange}
          />
        </I18nProvider>
      );

      const nameRow = await screen.findByTestId('nameField');
      const nameInput = within(nameRow).getByRole('textbox');
      expect(nameInput).toBeDisabled();
      expect(screen.queryByText("Name must not contain a '/'.")).not.toBeInTheDocument();

      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const lastCall = onChange.mock.calls.at(-1)?.[0];
      expect(await lastCall.validate()).toBe(true);
    });
  });

  describe('WHEN creating a new component template', () => {
    it('SHOULD reject a name containing a forward slash', async () => {
      const onChange = jest.fn();

      render(
        <I18nProvider>
          <StepLogistics
            defaultValue={baseDefaultValue}
            isEditing={false}
            onChange={onChange}
          />
        </I18nProvider>
      );

      const nameRow = await screen.findByTestId('nameField');
      const nameInput = within(nameRow).getByRole('textbox');
      fireEvent.change(nameInput, { target: { value: 'a/b' } });

      await screen.findByText("Name must not contain a '/'.");

      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const lastCall = onChange.mock.calls.at(-1)?.[0];
      expect(await lastCall.validate()).toBe(false);
    });
  });
});
