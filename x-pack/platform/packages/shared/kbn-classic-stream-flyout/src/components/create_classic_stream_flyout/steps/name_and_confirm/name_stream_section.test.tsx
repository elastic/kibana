/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, fireEvent } from '@testing-library/react';
import { NameStreamSection } from './name_stream_section';

const defaultProps = {
  indexPatterns: ['logs-*'],
  selectedIndexPattern: 'logs-*',
  streamNameParts: [''],
  onIndexPatternChange: jest.fn(),
  onStreamNamePartsChange: jest.fn(),
  validationError: null,
  conflictingIndexPattern: undefined,
};

const renderComponent = (props = {}) => {
  return render(
    <IntlProvider>
      <NameStreamSection {...defaultProps} {...props} />
    </IntlProvider>
  );
};

describe('NameStreamSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the section title', () => {
      const { getByText } = renderComponent();

      expect(getByText('Name classic stream')).toBeInTheDocument();
    });

    it('renders the stream name label', () => {
      const { getByText } = renderComponent();

      expect(getByText('Stream name')).toBeInTheDocument();
    });

    it('renders the help text', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(
          'Name your classic stream by entering values in the wildcard (*) portions of the index pattern.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('index pattern selector', () => {
    it('does not show index pattern selector for single pattern', () => {
      const { queryByTestId, queryByText } = renderComponent({
        indexPatterns: ['logs-*'],
      });

      expect(queryByTestId('indexPatternSelect')).not.toBeInTheDocument();
      expect(queryByText('Index pattern')).not.toBeInTheDocument();
    });

    it('shows index pattern selector for multiple patterns', () => {
      const { getByTestId, getByText } = renderComponent({
        indexPatterns: ['logs-*', 'metrics-*', 'traces-*'],
        selectedIndexPattern: 'logs-*',
      });

      expect(getByText('Index pattern')).toBeInTheDocument();
      expect(getByTestId('indexPatternSelect')).toBeInTheDocument();
    });

    it('displays all pattern options in the selector', () => {
      const { getByTestId } = renderComponent({
        indexPatterns: ['logs-*', 'metrics-*', 'traces-*'],
        selectedIndexPattern: 'logs-*',
      });

      const select = getByTestId('indexPatternSelect');
      const options = select.querySelectorAll('option');

      expect(options).toHaveLength(3);
      expect(options[0]).toHaveValue('logs-*');
      expect(options[1]).toHaveValue('metrics-*');
      expect(options[2]).toHaveValue('traces-*');
    });

    it('shows the selected pattern as the current value', () => {
      const { getByTestId } = renderComponent({
        indexPatterns: ['logs-*', 'metrics-*'],
        selectedIndexPattern: 'metrics-*',
      });

      const select = getByTestId('indexPatternSelect');
      expect(select).toHaveValue('metrics-*');
    });

    it('calls onIndexPatternChange when a different pattern is selected', () => {
      const onIndexPatternChange = jest.fn();
      const { getByTestId } = renderComponent({
        indexPatterns: ['logs-*', 'metrics-*'],
        selectedIndexPattern: 'logs-*',
        onIndexPatternChange,
      });

      const select = getByTestId('indexPatternSelect');
      fireEvent.change(select, { target: { value: 'metrics-*' } });

      expect(onIndexPatternChange).toHaveBeenCalledTimes(1);
      expect(onIndexPatternChange).toHaveBeenCalledWith('metrics-*');
    });

    it('uses first pattern as default when selectedIndexPattern is empty', () => {
      const { getByTestId } = renderComponent({
        indexPatterns: ['logs-*', 'metrics-*'],
        selectedIndexPattern: '',
      });

      // StreamNameInput should receive the first pattern
      const input = getByTestId('streamNameInput-wildcard-0');
      expect(input).toBeInTheDocument();
    });
  });

  describe('validation error messages', () => {
    // Note: StreamNameInput validation state (aria-invalid, per-field highlighting)
    // is covered in stream_name_input.test.tsx.
    // These tests focus on the error message text displayed by NameStreamSection.

    it('displays empty validation error message', () => {
      const { getByText } = renderComponent({
        validationError: 'empty',
      });

      expect(
        getByText(
          'You must specify a valid text string for all wildcards within the selected index pattern.'
        )
      ).toBeInTheDocument();
    });

    it('displays invalidFormat validation error message with formatted characters', () => {
      const { getByText } = renderComponent({
        validationError: 'invalidFormat',
      });

      // Check for the main text (the special characters are in EuiCode elements)
      expect(getByText(/Stream name cannot include/i)).toBeInTheDocument();
      expect(getByText(/or spaces/i)).toBeInTheDocument();
      expect(getByText(/It cannot start with/i)).toBeInTheDocument();
    });

    it('displays duplicate validation error message', () => {
      const { getByText } = renderComponent({
        validationError: 'duplicate',
      });

      expect(
        getByText('This stream name already exists. Try a different name.')
      ).toBeInTheDocument();
    });

    it('displays higherPriority validation error with conflicting pattern', () => {
      const { getByText } = renderComponent({
        validationError: 'higherPriority',
        conflictingIndexPattern: 'logs-*',
      });

      expect(getByText(/matches a higher priority index template/i)).toBeInTheDocument();
      expect(getByText('logs-*')).toBeInTheDocument();
    });

    it('does not display error message when validationError is null', () => {
      const { queryByText } = renderComponent({
        validationError: null,
      });

      expect(queryByText(/You must specify a valid text string/i)).not.toBeInTheDocument();
      expect(queryByText(/Stream name cannot include/i)).not.toBeInTheDocument();
      expect(queryByText(/already exists/i)).not.toBeInTheDocument();
      expect(queryByText(/higher priority/i)).not.toBeInTheDocument();
    });
  });

  describe('StreamNameInput integration', () => {
    // Note: Detailed StreamNameInput behavior (wildcard handling, pattern parsing,
    // prepend/append text, multiple wildcards) is covered in stream_name_input.test.tsx.
    // These tests verify the integration between NameStreamSection and StreamNameInput.

    it('passes streamNameParts to StreamNameInput', () => {
      const { getByTestId } = renderComponent({
        indexPatterns: ['logs-*'],
        streamNameParts: ['mystream'],
      });

      const input = getByTestId('streamNameInput-wildcard-0');
      expect(input).toHaveValue('mystream');
    });

    it('calls onStreamNamePartsChange when input changes', () => {
      const onStreamNamePartsChange = jest.fn();
      const { getByTestId } = renderComponent({
        indexPatterns: ['logs-*'],
        streamNameParts: [''],
        onStreamNamePartsChange,
      });

      const input = getByTestId('streamNameInput-wildcard-0');
      fireEvent.change(input, { target: { value: 'test' } });

      expect(onStreamNamePartsChange).toHaveBeenCalledWith(['test']);
    });

    it('passes validationError to StreamNameInput', () => {
      const { getByTestId } = renderComponent({
        indexPatterns: ['logs-*'],
        streamNameParts: [''],
        validationError: 'empty',
      });

      const input = getByTestId('streamNameInput-wildcard-0');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('renders inputs for multiple wildcards', () => {
      const { getByTestId } = renderComponent({
        indexPatterns: ['*-logs-*-data'],
        selectedIndexPattern: '*-logs-*-data',
        streamNameParts: ['', ''],
      });

      expect(getByTestId('streamNameInput-wildcard-0')).toBeInTheDocument();
      expect(getByTestId('streamNameInput-wildcard-1')).toBeInTheDocument();
    });
  });
});
