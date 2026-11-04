/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { stringify as yamlStringify } from 'yaml';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';

import { renderWithTestingProviders } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import { KibanaServices } from '../../common/lib/kibana';
import { CustomFieldTypes } from '../../../common/types/domain';
import { CaseFormFields } from '../case_form_fields';
import { getFieldDefinitions } from '../field_library/api/api';
import { getTemplate } from '../templates_v2/api/api';

jest.mock('../../containers/user_profiles/api');
jest.mock('../../containers/configure/api');
jest.mock('../../common/navigation/hooks');
jest.mock('../field_library/api/api');
jest.mock('../templates_v2/api/api');

const getFieldDefinitionsMock = getFieldDefinitions as jest.Mock;
const getTemplateMock = getTemplate as jest.Mock;

/**
 * End-to-end create-form submission through the REAL CaseFormFields →
 * CreateCaseTemplateFields → useTemplateFormSync → useResolvedFields pipeline (only the
 * network layer is mocked). Guards the legacy-visible dedup contract at the serialization
 * boundary: with "show legacy custom fields" on, a migrated template `$ref` to the linked
 * definition must contribute nothing to the submitted payload (the legacy input is the
 * single source for that field), while an inline template field that collides on the exact
 * storage key passes through untouched — exclusion is by `$ref` identity, never by name or
 * storage-key coincidence.
 */
describe('create form submission with legacy-visible linked fields (unmocked form pipeline)', () => {
  let user: UserEvent;

  const onSubmit = jest.fn();

  // EUI's test id generator gives every EuiFormRow the same generated id, so label-based
  // queries can resolve to the wrong input. Template-field inputs are located by their RHF
  // path in the `name` attribute instead.
  const COLLISION_INPUT_NAME = 'extended_fields.priority_as_keyword';
  const queryCollisionInputs = () =>
    screen
      .queryAllByRole('textbox')
      .filter((el) => el.getAttribute('name') === COLLISION_INPUT_NAME);

  // Legacy (v1) custom field rendered by the legacy section while the switch is on.
  const legacyCustomFieldsConfiguration = [
    {
      key: 'cf_priority',
      type: CustomFieldTypes.TEXT as const,
      label: 'Priority (legacy)',
      required: false,
    },
  ];

  // Migrated global definition linked to cf_priority. Its library default must never reach
  // the submitted extended_fields while the legacy input is visible.
  const linkedFieldDefinition = {
    fieldDefinitionId: 'fd-priority',
    name: 'priority',
    owner: 'securitySolution',
    isGlobal: true,
    legacyKey: 'cf_priority',
    definition: yamlStringify({
      name: 'priority',
      type: 'keyword',
      control: 'INPUT_TEXT',
      label: 'Priority',
      metadata: { default: 'field-library-default' },
    }),
  };

  // Migrated template: a `$ref` to the linked definition (must be dropped) plus an inline
  // template-local field whose storage key collides EXACTLY with the linked definition's
  // (`priority_as_keyword`) and must keep working.
  const migratedTemplate = {
    templateId: 'tmpl-1',
    templateVersion: 1,
    name: 'Migrated template',
    owner: 'securitySolution',
    definition: {
      name: 'Migrated template',
      fields: [
        { $ref: 'priority' },
        {
          name: 'priority',
          type: 'keyword',
          control: 'INPUT_TEXT',
          label: 'Template-local priority',
          metadata: { default: 'inline-default' },
        },
      ],
    },
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    localStorage.clear();
    localStorage.setItem('securitySolution.cases.showLegacyCustomFields', 'true');
    jest
      .spyOn(KibanaServices, 'getConfig')
      .mockReturnValue({ templates: { enabled: true } } as ReturnType<
        typeof KibanaServices.getConfig
      >);
    getFieldDefinitionsMock.mockResolvedValue({
      fieldDefinitions: [linkedFieldDefinition],
      total: 1,
    });
    getTemplateMock.mockResolvedValue(migratedTemplate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('serializes the legacy value in customFields and only the inline collision value in extended_fields', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={{ tags: [], templateId: 'tmpl-1' }} onSubmit={onSubmit}>
        {/* The real create form registers templateId through TemplatesV2's hidden field. */}
        <UseField path="templateId" component={HiddenField} />
        <CaseFormFields
          isLoading={false}
          configurationCustomFields={legacyCustomFieldsConfiguration}
        />
      </FormTestComponent>
    );

    // The legacy input renders…
    const legacyInput = await screen.findByTestId('cf_priority-text-create-custom-field');
    // …and the inline template field renders once the template sync resolves.
    expect(await screen.findByText('Template-local priority')).toBeInTheDocument();

    // The migrated $ref must not render a second control for the linked definition: its
    // library label ("Priority") appears nowhere, and exactly one input carries the colliding
    // storage-key path (the inline field). The legacy label is "Priority (legacy)" — a
    // different text node — so an exact-text query isolates the library control.
    expect(screen.queryByText('Priority')).not.toBeInTheDocument();
    expect(queryCollisionInputs()).toHaveLength(1);

    await user.clear(legacyInput);
    await user.click(legacyInput);
    await user.paste('legacy-value');

    await user.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    const [data, isValid] = onSubmit.mock.calls[onSubmit.mock.calls.length - 1];
    expect(isValid).toBe(true);

    // The legacy input is the single source for the linked field.
    expect(data.customFields).toEqual({ cf_priority: 'legacy-value' });

    // Exactly one extended_fields entry: the inline field's default under the colliding
    // storage key. The excluded $ref contributed neither the library default
    // ('field-library-default') nor a second entry.
    expect(data.extended_fields).toEqual({ priority_as_keyword: 'inline-default' });
  });

  it('lets the user edit the inline collision field independently of the legacy input', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={{ tags: [], templateId: 'tmpl-1' }} onSubmit={onSubmit}>
        <UseField path="templateId" component={HiddenField} />
        <CaseFormFields
          isLoading={false}
          configurationCustomFields={legacyCustomFieldsConfiguration}
        />
      </FormTestComponent>
    );

    // Wait for the template sync to finish seeding defaults before typing — its form reset
    // would otherwise clobber a value typed mid-initialization.
    await waitFor(() => {
      expect(queryCollisionInputs()[0]).toHaveValue('inline-default');
    });
    const inlineInput = queryCollisionInputs()[0];
    await user.clear(inlineInput);
    await user.click(inlineInput);
    await user.paste('typed-inline-value');

    const legacyInput = await screen.findByTestId('cf_priority-text-create-custom-field');
    await user.clear(legacyInput);
    await user.click(legacyInput);
    await user.paste('typed-legacy-value');

    await user.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    const [data] = onSubmit.mock.calls[onSubmit.mock.calls.length - 1];
    expect(data.customFields).toEqual({ cf_priority: 'typed-legacy-value' });
    expect(data.extended_fields).toEqual({ priority_as_keyword: 'typed-inline-value' });
  });

  it('within the template section, only the inline field renders — the $ref control is excluded', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={{ tags: [], templateId: 'tmpl-1' }} onSubmit={onSubmit}>
        <UseField path="templateId" component={HiddenField} />
        <CaseFormFields
          isLoading={false}
          configurationCustomFields={legacyCustomFieldsConfiguration}
        />
      </FormTestComponent>
    );

    const caseFormFields = await screen.findByTestId('case-form-fields');
    expect(await within(caseFormFields).findByText('Template-local priority')).toBeInTheDocument();

    // Exactly one textbox carries the colliding storage-key path — the inline field. A second
    // one would mean the $ref control leaked through and would double-submit the key.
    expect(queryCollisionInputs()).toHaveLength(1);
  });
});
