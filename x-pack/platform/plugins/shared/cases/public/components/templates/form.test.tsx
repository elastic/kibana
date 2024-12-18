/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, mockedTestProvidersOwner } from '../../common/mock';
import {
  MAX_TAGS_PER_TEMPLATE,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TEMPLATE_TAG_LENGTH,
} from '../../../common/constants';
import { ConnectorTypes, CustomFieldTypes } from '../../../common/types/domain';
import {
  connectorsMock,
  customFieldsConfigurationMock,
  templatesConfigurationMock,
} from '../../containers/mock';
import { useGetChoices } from '../connectors/servicenow/use_get_choices';
import { useGetChoicesResponse } from '../create/mock';
import type { FormState } from '../configure_cases/flyout';
import { TemplateForm } from './form';
import type { TemplateFormProps } from './types';

jest.mock('../connectors/servicenow/use_get_choices');

const useGetChoicesMock = useGetChoices as jest.Mock;

const SubmitButtonMock = ({ submit }: { submit: FormState<TemplateFormProps>['submit'] }) => (
  <button onClick={() => submit()} type="submit">
    {'testSubmit'}
  </button>
);

describe('TemplateForm', () => {
  let user: UserEvent;
  let appMockRenderer: AppMockRenderer;
  const defaultProps = {
    connectors: connectorsMock,
    currentConfiguration: {
      closureType: 'close-by-user' as const,
      connector: {
        fields: null,
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
      },
      customFields: [],
      templates: [],
      mappings: [],
      version: '',
      id: '',
      owner: mockedTestProvidersOwner[0],
    },
    onChange: jest.fn(),
    initialValue: null,
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    appMockRenderer = createAppMockRenderer();
    useGetChoicesMock.mockReturnValue(useGetChoicesResponse);
  });

  it('renders correctly', async () => {
    appMockRenderer.render(<TemplateForm {...defaultProps} />);

    expect(await screen.findByTestId('template-creation-form-steps')).toBeInTheDocument();
  });

  it('renders all default fields', async () => {
    appMockRenderer.render(<TemplateForm {...defaultProps} />);

    expect(await screen.findByTestId('template-name-input')).toBeInTheDocument();
    expect(await screen.findByTestId('template-description-input')).toBeInTheDocument();
    expect(await screen.findByTestId('case-form-fields')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(await screen.findByTestId('caseCategory')).toBeInTheDocument();
    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
  });

  it('renders all fields as per initialValue', async () => {
    const newProps = {
      ...defaultProps,
      initialValue: {
        key: 'template_key_1',
        name: 'Template 1',
        description: 'Sample description',
        caseFields: null,
      },
    };
    appMockRenderer.render(<TemplateForm {...newProps} />);

    expect(await screen.findByTestId('template-name-input')).toHaveValue('Template 1');
    expect(await screen.findByTestId('template-description-input')).toHaveValue(
      'Sample description'
    );
    expect(await screen.findByTestId('case-form-fields')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(await screen.findByTestId('caseCategory')).toBeInTheDocument();
    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
  });

  it('renders case fields as per initialValue', async () => {
    const newProps = {
      ...defaultProps,
      initialValue: {
        key: 'template_key_1',
        name: 'Template 1',
        description: 'Sample description',
        caseFields: {
          title: 'Case with template 1',
          description: 'case description',
        },
      },
    };
    appMockRenderer.render(<TemplateForm {...newProps} />);

    expect(await within(await screen.findByTestId('caseTitle')).findByTestId('input')).toHaveValue(
      'Case with template 1'
    );
    expect(
      await within(await screen.findByTestId('caseDescription')).findByTestId(
        'euiMarkdownEditorTextArea'
      )
    ).toHaveValue('case description');
  });

  it('renders case fields as optional', async () => {
    appMockRenderer.render(<TemplateForm {...defaultProps} />);

    const title = await screen.findByTestId('caseTitle');
    const tags = await screen.findByTestId('caseTags');
    const category = await screen.findByTestId('caseCategory');
    const description = await screen.findByTestId('caseDescription');

    expect(await within(title).findByTestId('form-optional-field-label')).toBeInTheDocument();
    expect(await within(tags).findByTestId('form-optional-field-label')).toBeInTheDocument();
    expect(await within(category).findByTestId('form-optional-field-label')).toBeInTheDocument();
    expect(await within(description).findByTestId('form-optional-field-label')).toBeInTheDocument();
  });

  // TODO: This test needs revisiting, it likely times out because of slow user events after
  // the upgrade to user-event v14 (https://github.com/elastic/kibana/pull/189949)
  it.skip('serializes the template field data correctly', async () => {
    let formState: FormState<TemplateFormProps>;

    const onChangeState = (state: FormState<TemplateFormProps>) => (formState = state);

    appMockRenderer.render(
      <>
        <TemplateForm {...{ ...defaultProps, onChange: onChangeState }} />
        <SubmitButtonMock submit={() => formState!.submit()} />
      </>
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    await user.click(await screen.findByTestId('template-name-input'));
    await user.paste('Template 1');

    await user.click(await screen.findByTestId('template-description-input'));
    await user.paste('this is a first template');

    const templateTags = await screen.findByTestId('template-tags');

    await user.click(within(templateTags).getByRole('combobox'));
    await user.paste('foo');
    await user.keyboard('{enter}');
    await user.paste('bar');
    await user.keyboard('{enter}');

    const submitSpy = jest.spyOn(formState!, 'submit');
    await user.click(screen.getByText('testSubmit'));

    await waitFor(() => {
      expect(submitSpy).toHaveReturnedWith(
        Promise.resolve({
          data: {
            key: expect.anything(),
            caseFields: {
              connector: {
                fields: null,
                id: 'none',
                name: 'none',
                type: '.none',
              },
              customFields: [],
              settings: {
                syncAlerts: true,
              },
            },
            description: 'this is a first template',
            name: 'Template 1',
            tags: ['foo', 'bar'],
          },
          isValid: true,
        })
      );
    });
  });

  it('serializes the template field data correctly with existing fields', async () => {
    let formState: FormState<TemplateFormProps>;

    const onChangeState = (state: FormState<TemplateFormProps>) => (formState = state);

    const newProps = {
      ...defaultProps,
      initialValue: { ...templatesConfigurationMock[0], tags: ['foo', 'bar'] },
      connectors: [],
      onChange: onChangeState,
      isEditMode: true,
    };

    appMockRenderer.render(
      <>
        <TemplateForm {...newProps} />
        <SubmitButtonMock submit={() => formState!.submit()} />
      </>
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    const submitSpy = jest.spyOn(formState!, 'submit');
    await user.click(screen.getByText('testSubmit'));

    await waitFor(() => {
      expect(submitSpy).toHaveReturnedWith(
        Promise.resolve({
          data: {
            key: expect.anything(),
            caseFields: {
              connector: {
                fields: null,
                id: 'none',
                name: 'none',
                type: '.none',
              },
              customFields: [],
              settings: {
                syncAlerts: true,
              },
            },
            description: 'This is a first test template',
            name: 'First test template',
            tags: ['foo', 'bar'],
          },
          isValid: true,
        })
      );
    });
  });

  it('serializes the case field data correctly', async () => {
    let formState: FormState<TemplateFormProps>;

    const onChangeState = (state: FormState<TemplateFormProps>) => (formState = state);

    appMockRenderer.render(
      <>
        <TemplateForm
          {...{
            ...defaultProps,
            initialValue: { key: 'template_1_key', name: 'Template 1', caseFields: null },
            onChange: onChangeState,
          }}
        />
        <SubmitButtonMock submit={() => formState!.submit()} />
      </>
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

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

    const submitSpy = jest.spyOn(formState!, 'submit');
    await user.click(screen.getByText('testSubmit'));

    await waitFor(() => {
      expect(submitSpy).toHaveReturnedWith(
        Promise.resolve({
          data: {
            key: expect.anything(),
            caseFields: {
              category: 'new',
              connector: {
                fields: null,
                id: 'none',
                name: 'none',
                type: '.none',
              },
              customFields: [],
              description: 'This is a case description',
              settings: {
                syncAlerts: true,
              },
              tags: ['template-1'],
              title: 'Case with Template 1',
            },
            description: undefined,
            name: 'Template 1',
            tags: [],
          },
          isValid: true,
        })
      );
    });
  });

  it('serializes the case field data correctly with existing fields', async () => {
    let formState: FormState<TemplateFormProps>;

    const onChangeState = (state: FormState<TemplateFormProps>) => (formState = state);

    const newProps = {
      ...defaultProps,
      initialValue: templatesConfigurationMock[3],
      connectors: [],
      onChange: onChangeState,
      isEditMode: true,
    };

    appMockRenderer.render(
      <>
        <TemplateForm {...newProps} />
        <SubmitButtonMock submit={() => formState!.submit()} />
      </>
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    const submitSpy = jest.spyOn(formState!, 'submit');
    await user.click(screen.getByText('testSubmit'));

    await waitFor(() => {
      expect(submitSpy).toHaveReturnedWith(
        Promise.resolve({
          data: {
            key: expect.anything(),
            caseFields: {
              connector: {
                fields: null,
                id: 'none',
                name: 'none',
                type: '.none',
              },
              customFields: [],
              description: 'case desc',
              settings: {
                syncAlerts: true,
              },
              severity: 'low',
              tags: ['sample-4'],
              title: 'Case with sample template 4',
            },
            description: 'This is a fourth test template',
            name: 'Fourth test template',
            tags: ['foo', 'bar'],
          },
          isValid: true,
        })
      );
    });
  });

  it('serializes the connector fields data correctly', async () => {
    let formState: FormState<TemplateFormProps>;

    const onChangeState = (state: FormState<TemplateFormProps>) => (formState = state);

    appMockRenderer.render(
      <>
        <TemplateForm
          {...{
            ...defaultProps,
            initialValue: { key: 'template_1_key', name: 'Template 1', caseFields: null },
            currentConfiguration: {
              ...defaultProps.currentConfiguration,
              connector: {
                id: 'servicenow-1',
                name: 'My SN connector',
                type: ConnectorTypes.serviceNowITSM,
                fields: null,
              },
            },
            onChange: onChangeState,
          }}
        />
        <SubmitButtonMock submit={() => formState!.submit()} />
      </>
    );

    await waitFor(async () => {
      expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
      expect(formState).not.toBeUndefined();
    });

    const submitSpy = jest.spyOn(formState!, 'submit');
    await user.click(screen.getByText('testSubmit'));

    await waitFor(() => {
      expect(submitSpy).toHaveReturnedWith(
        Promise.resolve({
          data: {
            key: expect.anything(),
            caseFields: {
              connector: {
                fields: null,
                id: 'none',
                name: 'none',
                type: '.none',
              },
              customFields: [],
              settings: {
                syncAlerts: true,
              },
            },
            description: undefined,
            name: 'Template 1',
            tags: [],
          },
          isValid: true,
        })
      );
    });
  });

  it('serializes the connector fields data correctly with existing connector', async () => {
    let formState: FormState<TemplateFormProps>;

    const onChangeState = (state: FormState<TemplateFormProps>) => (formState = state);

    const newProps = {
      ...defaultProps,
      initialValue: {
        key: 'template_1_key',
        name: 'Template 1',
        caseFields: {
          connector: {
            id: 'servicenow-1',
            type: ConnectorTypes.serviceNowITSM,
            name: 'my-SN-connector',
            fields: null,
          },
        },
      },
      connectors: connectorsMock,
      currentConfiguration: {
        ...defaultProps.currentConfiguration,
        connector: {
          id: 'resilient-2',
          name: 'My Resilient connector',
          type: ConnectorTypes.resilient,
          fields: null,
        },
      },
      onChange: onChangeState,
      isEditMode: true,
    };

    appMockRenderer.render(
      <>
        <TemplateForm {...newProps} />
        <SubmitButtonMock submit={() => formState!.submit()} />
      </>
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    expect(await screen.findByTestId('connector-fields-sn-itsm')).toBeInTheDocument();

    await user.selectOptions(await screen.findByTestId('categorySelect'), ['Denial of Service']);

    const submitSpy = jest.spyOn(formState!, 'submit');
    await user.click(screen.getByText('testSubmit'));

    await waitFor(() => {
      expect(submitSpy).toHaveReturnedWith(
        Promise.resolve({
          data: {
            key: expect.anything(),
            caseFields: {
              connector: {
                fields: {
                  category: 'Denial of Service',
                  impact: null,
                  severity: null,
                  subcategory: null,
                  urgency: null,
                },
                id: 'servicenow-1',
                name: 'My SN connector',
                type: '.servicenow',
              },
              customFields: [],
              settings: {
                syncAlerts: true,
              },
            },
            description: undefined,
            name: 'Template 1',
            tags: [],
          },
          isValid: true,
        })
      );
    });
  });

  it('serializes the custom fields data correctly', async () => {
    let formState: FormState<TemplateFormProps>;

    const onChangeState = (state: FormState<TemplateFormProps>) => (formState = state);

    appMockRenderer.render(
      <>
        <TemplateForm
          {...{
            ...defaultProps,
            initialValue: {
              key: 'template_1_key',
              name: 'Template 1',
              caseFields: null,
            },
            currentConfiguration: {
              ...defaultProps.currentConfiguration,
              customFields: customFieldsConfigurationMock,
            },
            onChange: onChangeState,
          }}
        />
        <SubmitButtonMock submit={() => formState!.submit()} />
      </>
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    const customFieldsElement = await screen.findByTestId('caseCustomFields');

    expect(
      await within(customFieldsElement).findAllByTestId('form-optional-field-label')
    ).toHaveLength(
      customFieldsConfigurationMock.filter(
        (field) => field.type === CustomFieldTypes.TEXT || field.type === CustomFieldTypes.NUMBER
      ).length
    );

    const textField = customFieldsConfigurationMock[0];
    const toggleField = customFieldsConfigurationMock[3];
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

    await user.click(numberCustomField);
    await user.paste('765');

    const submitSpy = jest.spyOn(formState!, 'submit');
    await user.click(screen.getByText('testSubmit'));

    await waitFor(() => {
      expect(submitSpy).toHaveReturnedWith(
        Promise.resolve({
          data: {
            key: expect.anything(),
            caseFields: {
              connector: {
                fields: null,
                id: 'none',
                name: 'none',
                type: '.none',
              },
              customFields: [
                {
                  key: 'test_key_1',
                  type: 'text',
                  value: 'My text test value 1',
                },
                {
                  key: 'test_key_2',
                  type: 'toggle',
                  value: true,
                },
                {
                  key: 'test_key_3',
                  type: 'text',
                  value: null,
                },
                {
                  key: 'test_key_4',
                  type: 'toggle',
                  value: true,
                },
                {
                  key: 'test_key_5',
                  type: 'number',
                  value: 1234,
                },
                {
                  key: 'test_key_6',
                  type: 'number',
                  value: true,
                },
              ],
              settings: {
                syncAlerts: true,
              },
            },
            description: undefined,
            name: 'Template 1',
            tags: [],
          },
          isValid: true,
        })
      );
    });
  });

  it('serializes the custom fields data correctly with existing custom fields', async () => {
    let formState: FormState<TemplateFormProps>;

    const onChangeState = (state: FormState<TemplateFormProps>) => (formState = state);

    const newProps = {
      ...defaultProps,
      initialValue: {
        key: 'template_1_key',
        name: 'Template 1',
        caseFields: {
          customFields: [
            {
              type: CustomFieldTypes.TEXT as const,
              key: 'test_key_1',
              value: 'this is my first custom field value',
            },
            {
              type: CustomFieldTypes.TOGGLE as const,
              key: 'test_key_2',
              value: false,
            },
          ],
        },
      },
      onChange: onChangeState,
      currentConfiguration: {
        ...defaultProps.currentConfiguration,
        customFields: customFieldsConfigurationMock,
      },
    };
    appMockRenderer.render(
      <>
        <TemplateForm {...newProps} />
        <SubmitButtonMock submit={() => formState!.submit()} />
      </>
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    const toggleField = customFieldsConfigurationMock[1];

    await user.click(
      await screen.findByTestId(`${toggleField.key}-${toggleField.type}-create-custom-field`)
    );

    const submitSpy = jest.spyOn(formState!, 'submit');
    await user.click(screen.getByText('testSubmit'));

    await waitFor(() => {
      expect(submitSpy).toHaveReturnedWith(
        Promise.resolve({
          data: {
            key: expect.anything(),
            caseFields: {
              connector: {
                fields: null,
                id: 'none',
                name: 'none',
                type: '.none',
              },
              customFields: [
                {
                  key: 'test_key_1',
                  type: 'text',
                  value: 'this is my first custom field value',
                },
                {
                  key: 'test_key_2',
                  type: 'toggle',
                  value: true,
                },
                {
                  key: 'test_key_3',
                  type: 'text',
                  value: null,
                },
                {
                  key: 'test_key_4',
                  type: 'toggle',
                  value: false,
                },
              ],
              settings: {
                syncAlerts: true,
              },
            },
            description: undefined,
            name: 'Template 1',
            tags: [],
          },
          isValid: true,
        })
      );
    });
  });

  it('shows form state as invalid when template name missing', async () => {
    let formState: FormState<TemplateFormProps>;

    const onChangeState = (state: FormState<TemplateFormProps>) => (formState = state);

    appMockRenderer.render(
      <>
        <TemplateForm {...{ ...defaultProps, onChange: onChangeState }} />
        <SubmitButtonMock submit={() => formState!.submit()} />
      </>
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    await user.click(await screen.findByTestId('template-name-input'));
    await user.paste('');

    const submitSpy = jest.spyOn(formState!, 'submit');
    await user.click(screen.getByText('testSubmit'));

    await waitFor(() => {
      expect(submitSpy).toHaveReturnedWith(
        Promise.resolve({
          data: {},
          isValid: false,
        })
      );
    });
  });

  it('shows form state as invalid when template name is too long', async () => {
    let formState: FormState<TemplateFormProps>;

    const onChangeState = (state: FormState<TemplateFormProps>) => (formState = state);

    appMockRenderer.render(
      <>
        <TemplateForm {...{ ...defaultProps, onChange: onChangeState }} />
        <SubmitButtonMock submit={() => formState!.submit()} />
      </>
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    const name = 'a'.repeat(MAX_TEMPLATE_NAME_LENGTH + 1);

    await user.click(await screen.findByTestId('template-name-input'));
    await user.paste(name);

    const submitSpy = jest.spyOn(formState!, 'submit');
    await user.click(screen.getByText('testSubmit'));

    await waitFor(() => {
      expect(submitSpy).toHaveReturnedWith(
        Promise.resolve({
          data: {},
          isValid: false,
        })
      );
    });
  });

  it('shows form state as invalid when template description is too long', async () => {
    let formState: FormState<TemplateFormProps>;

    const onChangeState = (state: FormState<TemplateFormProps>) => (formState = state);

    appMockRenderer.render(
      <>
        <TemplateForm {...{ ...defaultProps, onChange: onChangeState }} />
        <SubmitButtonMock submit={() => formState!.submit()} />
      </>
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    const description = 'a'.repeat(MAX_TEMPLATE_DESCRIPTION_LENGTH + 1);

    await user.click(await screen.findByTestId('template-description-input'));
    await user.paste(description);

    const submitSpy = jest.spyOn(formState!, 'submit');
    await user.click(screen.getByText('testSubmit'));

    await waitFor(() => {
      expect(submitSpy).toHaveReturnedWith(
        Promise.resolve({
          data: {},
          isValid: false,
        })
      );
    });
  });

  it('shows form state as invalid when template tags are more than 10', async () => {
    let formState: FormState<TemplateFormProps>;

    const onChangeState = (state: FormState<TemplateFormProps>) => (formState = state);

    appMockRenderer.render(
      <>
        <TemplateForm {...{ ...defaultProps, onChange: onChangeState }} />
        <SubmitButtonMock submit={() => formState!.submit()} />
      </>
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    const tagsArray = Array(MAX_TAGS_PER_TEMPLATE + 1).fill('foo');

    const templateTags = await screen.findByTestId('template-tags');

    await user.click(within(templateTags).getByRole('combobox'));
    for (let i = 0; i < tagsArray.length; i++) {
      await user.paste('template-1');
      await user.keyboard('{enter}');
    }

    const submitSpy = jest.spyOn(formState!, 'submit');
    await user.click(screen.getByText('testSubmit'));

    await waitFor(() => {
      expect(submitSpy).toHaveReturnedWith(
        Promise.resolve({
          data: {},
          isValid: false,
        })
      );
    });
  });

  it('shows form state as invalid when template tag is more than 50 characters', async () => {
    let formState: FormState<TemplateFormProps>;

    const onChangeState = (state: FormState<TemplateFormProps>) => (formState = state);

    appMockRenderer.render(
      <>
        <TemplateForm {...{ ...defaultProps, onChange: onChangeState }} />
        <SubmitButtonMock submit={() => formState!.submit()} />
      </>
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    const x = 'a'.repeat(MAX_TEMPLATE_TAG_LENGTH + 1);

    const templateTags = await screen.findByTestId('template-tags');

    await user.click(within(templateTags).getByRole('combobox'));
    await user.paste(x);
    await user.keyboard('{enter}');

    const submitSpy = jest.spyOn(formState!, 'submit');
    await user.click(screen.getByText('testSubmit'));

    await waitFor(() => {
      expect(submitSpy).toHaveReturnedWith(
        Promise.resolve({
          data: {},
          isValid: false,
        })
      );
    });
  });
});
