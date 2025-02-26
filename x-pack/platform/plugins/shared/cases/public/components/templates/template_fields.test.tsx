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
import { createAppMockRenderer } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import { TemplateFields } from './template_fields';

// FLAKY: https://github.com/elastic/kibana/issues/194703
describe('Template fields', () => {
  let user: UserEvent;
  let appMockRenderer: AppMockRenderer;
  const onSubmit = jest.fn();
  const formDefaultValue = { templateTags: [] };
  const defaultProps = {
    isLoading: false,
    configurationTemplateTags: [],
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
  });

  afterEach(async () => {
    await appMockRenderer.clearQueryCache();
  });

  it('renders template fields correctly', async () => {
    appMockRenderer.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <TemplateFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-name-input')).toBeInTheDocument();
    expect(await screen.findByTestId('template-tags')).toBeInTheDocument();
    expect(await screen.findByTestId('template-description-input')).toBeInTheDocument();
  });

  it('renders template fields with existing value', async () => {
    appMockRenderer.render(
      <FormTestComponent
        formDefaultValue={{
          name: 'Sample template',
          templateDescription: 'This is a template description',
          templateTags: ['template-1', 'template-2'],
        }}
        onSubmit={onSubmit}
      >
        <TemplateFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-name-input')).toHaveValue('Sample template');

    const templateTags = await screen.findByTestId('template-tags');

    expect(await within(templateTags).findByTestId('comboBoxInput')).toHaveTextContent(
      'template-1'
    );
    expect(await within(templateTags).findByTestId('comboBoxInput')).toHaveTextContent(
      'template-2'
    );

    expect(await screen.findByTestId('template-description-input')).toHaveTextContent(
      'This is a template description'
    );
  });

  it('calls onSubmit with template fields', async () => {
    appMockRenderer.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <TemplateFields {...defaultProps} />
      </FormTestComponent>
    );

    await user.click(await screen.findByTestId('template-name-input'));
    await user.paste('Template 1');

    const templateTags = await screen.findByTestId('template-tags');

    await user.click(await within(templateTags).findByRole('combobox'));
    await user.paste('first');
    await user.keyboard('{enter}');

    await user.click(await screen.findByTestId('template-description-input'));
    await user.paste('this is a first template');

    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          name: 'Template 1',
          templateDescription: 'this is a first template',
          templateTags: ['first'],
        },
        true
      );
    });
  });

  it('calls onSubmit with updated template fields', async () => {
    appMockRenderer.render(
      <FormTestComponent
        formDefaultValue={{
          name: 'Sample template',
          templateDescription: 'This is a template description',
          templateTags: ['template-1', 'template-2'],
        }}
        onSubmit={onSubmit}
      >
        <TemplateFields {...defaultProps} />
      </FormTestComponent>
    );

    await user.click(await screen.findByTestId('template-name-input'));
    await user.paste('!!');

    const templateTags = await screen.findByTestId('template-tags');

    await user.click(await within(templateTags).findByRole('combobox'));
    await user.paste('first');
    await user.keyboard('{enter}');

    await user.click(await screen.findByTestId('template-description-input'));
    await user.paste('..');

    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          name: 'Sample template!!',
          templateDescription: 'This is a template description..',
          templateTags: ['template-1', 'template-2', 'first'],
        },
        true
      );
    });
  });
});
