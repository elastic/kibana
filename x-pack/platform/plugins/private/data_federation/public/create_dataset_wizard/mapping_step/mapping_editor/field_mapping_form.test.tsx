/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render } from '@testing-library/react';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { FieldMappingForm, type FieldMappingFormProps } from './field_mapping_form';

const docLinksMock = {
  links: { elasticsearch: {} },
} as unknown as DocLinksStart;

const keywordField = { type: 'keyword', name: 'host', path: '', format: '' } as const;
const dateField = { type: 'date', name: 'ts', path: 'event_time', format: 'yyyy-MM-dd' } as const;

const renderForm = (props: Partial<FieldMappingFormProps> = {}) => {
  const onSubmit = jest.fn();
  const utils = render(
    <EuiProvider>
      <KibanaContextProvider services={{ docLinks: docLinksMock }}>
        <FieldMappingForm value={keywordField} mode="create" onSubmit={onSubmit} {...props} />
      </KibanaContextProvider>
    </EuiProvider>
  );
  return { ...utils, onSubmit: props.onSubmit ?? onSubmit };
};

const getFormatInput = (getByTestId: ReturnType<typeof render>['getByTestId']) =>
  getByTestId('dataFederationMappingEditorFieldFormat').querySelector('input');

const changeType = (getByTestId: ReturnType<typeof render>['getByTestId'], type: string) =>
  fireEvent.change(getByTestId('dataFederationMappingEditorFieldType'), {
    target: { value: type },
  });

describe('FieldMappingForm', () => {
  describe('WHEN rendered with a value', () => {
    it('SHOULD prefill the type, name, and original field name', () => {
      const { getByTestId } = renderForm({ value: dateField });

      expect(getByTestId('dataFederationMappingEditorFieldType')).toHaveValue('date');
      expect(getByTestId('dataFederationMappingEditorFieldName')).toHaveValue('ts');
      expect(getByTestId('dataFederationMappingEditorFieldPath')).toHaveValue('event_time');
    });
  });

  describe('WHEN the type is not date-like', () => {
    it('SHOULD not render the date format field', () => {
      const { queryByTestId } = renderForm();

      expect(queryByTestId('dataFederationMappingEditorFieldFormat')).toBeNull();
    });
  });

  describe('WHEN the type is date-like', () => {
    it.each(['date', 'date_nanos'])('SHOULD render the date format field for %p', (type) => {
      const { getByTestId } = renderForm({ value: { ...keywordField, type } });

      expect(getByTestId('dataFederationMappingEditorFieldFormat')).toBeInTheDocument();
    });

    it('SHOULD show the current format', () => {
      const { getByTestId } = renderForm({ value: dateField });

      expect(getFormatInput(getByTestId)).toHaveValue('yyyy-MM-dd');
    });

    it('SHOULD include a selected format in the submitted value', async () => {
      const { getByTestId, getByText, onSubmit } = renderForm({
        value: { ...dateField, format: '' },
      });

      const formatCombo = getByTestId('dataFederationMappingEditorFieldFormat');
      await act(async () => {
        fireEvent.click(formatCombo.querySelector('input') ?? formatCombo);
      });
      await act(async () => {
        fireEvent.click(getByText('yyyy-MM-dd HH:mm:ss'));
      });
      fireEvent.click(getByTestId('dataFederationMappingEditorDraftAddField'));

      expect(onSubmit).toHaveBeenCalledWith({ ...dateField, format: 'yyyy-MM-dd HH:mm:ss' });
    });
  });

  describe('WHEN the type changes', () => {
    it('SHOULD clear the format and hide the format field for a non-date type', () => {
      const onDraftChange = jest.fn();
      const { getByTestId, queryByTestId, onSubmit } = renderForm({
        value: dateField,
        onDraftChange,
      });

      changeType(getByTestId, 'keyword');

      expect(onDraftChange).toHaveBeenLastCalledWith({ ...dateField, type: 'keyword', format: '' });
      expect(queryByTestId('dataFederationMappingEditorFieldFormat')).toBeNull();

      fireEvent.click(getByTestId('dataFederationMappingEditorDraftAddField'));
      expect(onSubmit).toHaveBeenCalledWith({ ...dateField, type: 'keyword', format: '' });
    });

    it('SHOULD keep the format when switching between date-like types', () => {
      const onDraftChange = jest.fn();
      const { getByTestId } = renderForm({ value: dateField, onDraftChange });

      changeType(getByTestId, 'date_nanos');

      expect(onDraftChange).toHaveBeenLastCalledWith({ ...dateField, type: 'date_nanos' });
      expect(getFormatInput(getByTestId)).toHaveValue('yyyy-MM-dd');
    });
  });

  describe('WHEN the name or original field name is edited', () => {
    it('SHOULD report each change through onDraftChange and submit the edited value', () => {
      const onDraftChange = jest.fn();
      const { getByTestId, onSubmit } = renderForm({ onDraftChange });

      fireEvent.change(getByTestId('dataFederationMappingEditorFieldName'), {
        target: { value: 'hostname' },
      });
      expect(onDraftChange).toHaveBeenLastCalledWith({ ...keywordField, name: 'hostname' });

      fireEvent.change(getByTestId('dataFederationMappingEditorFieldPath'), {
        target: { value: 'host.name' },
      });
      expect(onDraftChange).toHaveBeenLastCalledWith({
        ...keywordField,
        name: 'hostname',
        path: 'host.name',
      });

      fireEvent.click(getByTestId('dataFederationMappingEditorDraftAddField'));
      expect(onSubmit).toHaveBeenCalledWith({
        ...keywordField,
        name: 'hostname',
        path: 'host.name',
      });
    });
  });

  describe('WHEN errors are provided', () => {
    it('SHOULD show the name error and mark the name field invalid', () => {
      const { getByTestId, getByText } = renderForm({ errors: { name: 'Name is required' } });

      expect(getByText('Name is required')).toBeInTheDocument();
      expect(getByTestId('dataFederationMappingEditorFieldName')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });

    it('SHOULD show the format error for a date-like type', () => {
      const { getByText } = renderForm({
        value: dateField,
        errors: { format: 'Invalid format' },
      });

      expect(getByText('Invalid format')).toBeInTheDocument();
    });

    it('SHOULD not mark the name field invalid without a name error', () => {
      const { getByTestId } = renderForm();

      expect(getByTestId('dataFederationMappingEditorFieldName')).not.toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });
  });

  describe('WHEN the mode is create', () => {
    it('SHOULD render the add button and not the update button', () => {
      const { getByTestId, queryByTestId } = renderForm({ mode: 'create' });

      expect(getByTestId('dataFederationMappingEditorDraftAddField')).toBeInTheDocument();
      expect(queryByTestId('dataFederationMappingEditorUpdateField')).toBeNull();
    });
  });

  describe('WHEN the mode is edit', () => {
    it('SHOULD render the update button and submit the draft', () => {
      const { getByTestId, queryByTestId, onSubmit } = renderForm({ mode: 'edit' });

      expect(queryByTestId('dataFederationMappingEditorDraftAddField')).toBeNull();
      fireEvent.click(getByTestId('dataFederationMappingEditorUpdateField'));
      expect(onSubmit).toHaveBeenCalledWith(keywordField);
    });
  });

  describe('WHEN onCancel is provided', () => {
    it('SHOULD render a cancel button that calls onCancel without submitting', () => {
      const onCancel = jest.fn();
      const { getByTestId, onSubmit } = renderForm({ onCancel });

      fireEvent.click(getByTestId('dataFederationMappingEditorCancelField'));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('WHEN onCancel is not provided', () => {
    it('SHOULD not render a cancel button', () => {
      const { queryByTestId } = renderForm();

      expect(queryByTestId('dataFederationMappingEditorCancelField')).toBeNull();
    });
  });
});
