/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import { noCasesSettingsPermission, renderWithTestingProviders } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import { customFieldsConfigurationMock } from '../../containers/mock';
import { userProfiles } from '../../containers/user_profiles/api.mock';

import { CaseFormFields } from '.';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { KibanaServices } from '../../common/lib/kibana';

jest.mock('../../containers/user_profiles/api');
jest.mock('../create/template_fields', () => ({
  CreateCaseTemplateFields: () => <div data-test-subj="create-case-template-fields" />,
}));
jest.mock('../../common/navigation/hooks');

describe('CaseFormFields', () => {
  let user: UserEvent;

  const onSubmit = jest.fn();
  const formDefaultValue = { tags: [] };
  const defaultProps = {
    isLoading: false,
    configurationCustomFields: [],
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
    jest.spyOn(KibanaServices, 'getConfig').mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('case-form-fields')).toBeInTheDocument();
  });

  it('renders case fields correctly', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(await screen.findByTestId('caseCategory')).toBeInTheDocument();
    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
  });

  it('does not render customFields when empty', () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(screen.queryByTestId('caseCustomFields')).not.toBeInTheDocument();
  });

  it('renders customFields when not empty', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields
          isLoading={false}
          configurationCustomFields={customFieldsConfigurationMock}
        />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();
  });

  it('does not render assignees when no platinum license', () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(screen.queryByTestId('createCaseAssigneesComboBox')).not.toBeInTheDocument();
  });

  it('renders assignees when platinum license', async () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>,
      { wrapperProps: { license } }
    );

    expect(await screen.findByTestId('createCaseAssigneesComboBox')).toBeInTheDocument();
  });

  it('calls onSubmit with case fields', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    const caseTitle = await screen.findByTestId('caseTitle');
    await user.click(within(caseTitle).getByTestId('input'));
    await user.paste('Case with Template 1');

    const caseDescription = await screen.findByTestId('caseDescription');
    await user.click(within(caseDescription).getByTestId('euiMarkdownEditorTextArea'));
    await user.paste('This is a case description');

    const caseTags = await screen.findByTestId('caseTags');
    await user.click(within(caseTags).getByRole('combobox'));
    await user.paste('template-1');
    await user.keyboard('{enter}');

    const caseCategory = await screen.findByTestId('caseCategory');
    await user.type(within(caseCategory).getByRole('combobox'), 'new {enter}');

    await user.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: 'new',
          tags: ['template-1'],
          description: 'This is a case description',
          title: 'Case with Template 1',
        },
        true
      );
    });
  });

  it('calls onSubmit with existing case fields', async () => {
    renderWithTestingProviders(
      <FormTestComponent
        formDefaultValue={{
          title: 'Case with Template 1',
          description: 'This is a case description',
          tags: ['case-tag-1', 'case-tag-2'],
          category: null,
        }}
        onSubmit={onSubmit}
      >
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    await user.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: null,
          tags: ['case-tag-1', 'case-tag-2'],
          description: 'This is a case description',
          title: 'Case with Template 1',
        },
        true
      );
    });
  });

  it('calls onSubmit with custom fields', async () => {
    const newProps = {
      ...defaultProps,
      configurationCustomFields: customFieldsConfigurationMock,
    };

    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();

    const textField = customFieldsConfigurationMock[0];
    const toggleField = customFieldsConfigurationMock[1];
    const numberField = customFieldsConfigurationMock[4];

    const textCustomField = await screen.findByTestId(
      `${textField.key}-${textField.type}-create-custom-field`
    );

    await user.clear(textCustomField);
    await user.click(textCustomField);
    await user.paste('My text test value 1');

    await user.click(
      await screen.findByTestId(`${toggleField.key}-${toggleField.type}-create-custom-field`)
    );

    const numberCustomField = await screen.findByTestId(
      `${numberField.key}-${numberField.type}-create-custom-field`
    );

    await user.clear(numberCustomField);
    await user.paste('4321');

    await user.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: null,
          tags: [],
          customFields: {
            test_key_1: 'My text test value 1',
            test_key_2: false,
            test_key_4: false,
            test_key_5: '4321',
          },
        },
        true
      );
    });
  });

  it('calls onSubmit with existing custom fields', async () => {
    const newProps = {
      ...defaultProps,
      configurationCustomFields: customFieldsConfigurationMock,
    };

    renderWithTestingProviders(
      <FormTestComponent
        formDefaultValue={{
          customFields: { [customFieldsConfigurationMock[0].key]: 'Test custom filed value' },
          tags: [],
        }}
        onSubmit={onSubmit}
      >
        <CaseFormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();

    await user.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: null,
          tags: [],
          customFields: {
            test_key_1: 'Test custom filed value',
            test_key_2: true,
            test_key_4: false,
            test_key_5: 123,
          },
        },
        true
      );
    });
  });

  it('calls onSubmit with assignees', async () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>,
      { wrapperProps: { license } }
    );

    const assigneesComboBox = await screen.findByTestId('createCaseAssigneesComboBox');

    await user.click(await within(assigneesComboBox).findByTestId('comboBoxToggleListButton'));

    await waitForEuiPopoverOpen();

    await user.click(screen.getByText(`${userProfiles[0].user.full_name}`));

    await user.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: null,
          tags: [],
          assignees: [{ uid: userProfiles[0].uid }],
        },
        true
      );
    });
  });

  it('calls onSubmit with existing assignees', async () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    renderWithTestingProviders(
      <FormTestComponent
        formDefaultValue={{
          assignees: [{ uid: userProfiles[1].uid }],
          tags: [],
        }}
        onSubmit={onSubmit}
      >
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>,
      { wrapperProps: { license } }
    );

    await user.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: null,
          tags: [],
          assignees: [{ uid: userProfiles[1].uid }],
        },
        true
      );
    });
  });

  describe('templates v2', () => {
    it('does not render CreateCaseTemplateFields when templates v2 is disabled', () => {
      jest.spyOn(KibanaServices, 'getConfig').mockReturnValue(undefined);

      renderWithTestingProviders(
        <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
          <CaseFormFields {...defaultProps} />
        </FormTestComponent>
      );

      expect(screen.queryByTestId('create-case-template-fields')).not.toBeInTheDocument();
    });

    it('renders CreateCaseTemplateFields when templates v2 is enabled', async () => {
      jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);

      renderWithTestingProviders(
        <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
          <CaseFormFields {...defaultProps} />
        </FormTestComponent>
      );

      expect(await screen.findByTestId('create-case-template-fields')).toBeInTheDocument();
    });

    it('does not render legacy custom fields when templates v2 is enabled and the switch is off', () => {
      jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);

      renderWithTestingProviders(
        <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
          <CaseFormFields
            isLoading={false}
            configurationCustomFields={customFieldsConfigurationMock}
          />
        </FormTestComponent>
      );

      expect(screen.queryByTestId('caseCustomFields')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('legacy-custom-fields-deprecation-callout')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('legacy-custom-fields-divider')).not.toBeInTheDocument();
      expect(screen.queryByTestId('legacy-custom-fields-deprecated-badge')).not.toBeInTheDocument();
    });

    it('renders legacy custom fields, badge, callout, and divider when the switch is on', async () => {
      jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);
      localStorage.setItem('securitySolution.cases.showLegacyCustomFields', 'true');

      renderWithTestingProviders(
        <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
          <CaseFormFields
            isLoading={false}
            configurationCustomFields={customFieldsConfigurationMock}
          />
        </FormTestComponent>
      );

      expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();
      expect(
        await screen.findByTestId('legacy-custom-fields-deprecated-badge')
      ).toBeInTheDocument();
      expect(
        await screen.findByTestId('legacy-custom-fields-deprecation-callout')
      ).toBeInTheDocument();
      // announceOnMount duplicates content into a live region with the same test subjects.
      const content = screen.getByTestId('legacy-custom-fields-deprecation-callout__content');
      expect(within(content).getByTestId('legacy-custom-fields-view-new-link')).toBeInTheDocument();
      expect(
        within(content).getByTestId('legacy-custom-fields-view-settings-link')
      ).toBeInTheDocument();
      expect(screen.getByTestId('legacy-custom-fields-divider')).toBeInTheDocument();
    });

    it('shows the administrator message in the deprecation callout when the user lacks settings permission', async () => {
      jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);
      localStorage.setItem('securitySolution.cases.showLegacyCustomFields', 'true');

      renderWithTestingProviders(
        <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
          <CaseFormFields
            isLoading={false}
            configurationCustomFields={customFieldsConfigurationMock}
          />
        </FormTestComponent>,
        {
          wrapperProps: { permissions: noCasesSettingsPermission() },
        }
      );

      expect(
        await screen.findByTestId('legacy-custom-fields-deprecation-callout')
      ).toBeInTheDocument();
      const content = screen.getByTestId('legacy-custom-fields-deprecation-callout__content');
      expect(
        within(content).queryByTestId('legacy-custom-fields-view-new-link')
      ).not.toBeInTheDocument();
      expect(
        within(content).queryByTestId('legacy-custom-fields-view-settings-link')
      ).not.toBeInTheDocument();
      expect(
        within(content).getByText(
          /Contact your administrator to confirm the fields have been migrated/i
        )
      ).toBeInTheDocument();
    });

    it('forces legacy custom fields visible when required fields lack defaults', async () => {
      jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);

      renderWithTestingProviders(
        <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
          <CaseFormFields
            isLoading={false}
            configurationCustomFields={[
              {
                ...customFieldsConfigurationMock[0],
                required: true,
                defaultValue: undefined,
              },
            ]}
          />
        </FormTestComponent>
      );

      expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();
      expect(
        await screen.findByTestId('legacy-custom-fields-deprecation-callout')
      ).toBeInTheDocument();
    });
  });
});
