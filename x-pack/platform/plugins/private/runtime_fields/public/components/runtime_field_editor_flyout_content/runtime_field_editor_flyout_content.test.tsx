/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';

import '../../__jest__/setup_environment';
import type { RuntimeField } from '../../types';
import type { Props } from './runtime_field_editor_flyout_content';
import { RuntimeFieldEditorFlyoutContent } from './runtime_field_editor_flyout_content';

const docLinks = docLinksServiceMock.createStartContract();

const noop = () => {};
const defaultProps = { onSave: noop, onCancel: noop, docLinks };

describe('Runtime field editor flyout', () => {
  const renderComponent = (props: Partial<Props> = {}) =>
    render(
      <I18nProvider>
        <RuntimeFieldEditorFlyoutContent {...defaultProps} {...props} />
      </I18nProvider>
    );

  test('should have a flyout title', () => {
    renderComponent();

    expect(screen.getByTestId('flyoutTitle')).toHaveTextContent('Create new field');
  });

  test('should allow a runtime field to be provided', () => {
    const field: RuntimeField = {
      name: 'foo',
      type: 'date',
      script: { source: 'test=123' },
    };

    renderComponent({ defaultValue: field });

    expect(screen.getByTestId('flyoutTitle')).toHaveTextContent(`Edit ${field.name} field`);
    expect(screen.getByLabelText('Name field')).toHaveValue(field.name);
    expect(screen.getByTestId('typeField')).toHaveValue(field.type);
    expect(screen.getByTestId('scriptField')).toHaveValue(field.script.source);
  });

  test('should accept an onSave prop', async () => {
    const field: RuntimeField = {
      name: 'foo',
      type: 'date',
      script: { source: 'test=123' },
    };
    const onSave: jest.Mock<Props['onSave']> = jest.fn();

    renderComponent({ onSave, defaultValue: field });

    fireEvent.click(screen.getByTestId('saveFieldButton'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[onSave.mock.calls.length - 1][0]).toEqual(field);
  });

  test('should accept an onCancel prop', () => {
    const onCancel = jest.fn();
    renderComponent({ onCancel });

    fireEvent.click(screen.getByTestId('closeFlyoutButton'));

    expect(onCancel).toHaveBeenCalled();
  });

  describe('validation', () => {
    test('should validate the fields and prevent saving invalid form', async () => {
      const onSave: jest.Mock<Props['onSave']> = jest.fn();

      renderComponent({ onSave });

      expect(screen.getByTestId('saveFieldButton')).not.toBeDisabled();

      fireEvent.click(screen.getByTestId('saveFieldButton'));

      await waitFor(() => expect(onSave).not.toHaveBeenCalled());
      await waitFor(() => expect(screen.getByTestId('saveFieldButton')).toBeDisabled());

      await screen.findByText('Give a name to the field.');
      await screen.findByTestId('formError');
      expect(screen.getByTestId('formError')).toHaveTextContent(
        'Fix errors in form before continuing.'
      );
    });

    test('should forward values from the form', async () => {
      const onSave: jest.Mock<Props['onSave']> = jest.fn();

      renderComponent({ onSave });

      fireEvent.change(screen.getByLabelText('Name field'), { target: { value: 'someName' } });
      fireEvent.change(screen.getByTestId('scriptField'), { target: { value: 'script=123' } });

      fireEvent.click(screen.getByTestId('saveFieldButton'));

      await waitFor(() => expect(onSave).toHaveBeenCalled());
      expect(onSave.mock.calls[onSave.mock.calls.length - 1][0]).toEqual({
        name: 'someName',
        type: 'keyword', // default to keyword
        script: { source: 'script=123' },
      });

      // Change the type and make sure it is forwarded
      fireEvent.change(screen.getByTestId('typeField'), { target: { value: 'other_type' } });
      fireEvent.click(screen.getByTestId('saveFieldButton'));

      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
      expect(onSave.mock.calls[onSave.mock.calls.length - 1][0]).toEqual({
        name: 'someName',
        type: 'other_type',
        script: { source: 'script=123' },
      });
    });
  });
});
