/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiSuperSelectTestHarness } from '@kbn/test-eui-helpers';

import { Form, useForm } from '../../../shared_imports';
import { AnalyzerParameter } from './analyzer_parameter';
import { AnalyzersParameter } from './analyzers_parameter';
import type { NormalizedField } from '../../../types';

jest.mock('../../../config_context', () => {
  let mockIndexSettings: Record<string, unknown> = {};
  return {
    useConfig: () => ({
      value: { indexSettings: mockIndexSettings },
      update: jest.fn(),
    }),
    __setMockIndexSettings: (settings: Record<string, unknown>) => {
      mockIndexSettings = settings;
    },
  };
});

// AnalyzersParameter uses documentationService.getAnalyzerLink() for a doc link
jest.mock('../../../../../services/documentation', () => ({
  documentationService: {
    getAnalyzerLink: () => 'https://example.com/docs',
  },
}));

const { __setMockIndexSettings } = jest.requireMock('../../../config_context');

const createMockField = (source: Record<string, unknown> = {}): NormalizedField => ({
  id: 'test-field',
  nestedDepth: 0,
  path: ['myField'],
  source: { name: 'myField', type: 'text', ...source },
  isMultiField: false,
  childFieldsName: undefined,
  canHaveChildFields: false,
  canHaveMultiFields: false,
  hasChildFields: false,
  hasMultiFields: false,
  isExpanded: false,
});

interface FormWrapperProps {
  children: React.ReactNode;
  defaultValue?: Record<string, unknown>;
}

const FormWrapper = ({ children, defaultValue = {} }: FormWrapperProps) => {
  const { form } = useForm({ defaultValue });
  return (
    <I18nProvider>
      <Form form={form}>{children}</Form>
    </I18nProvider>
  );
};

beforeEach(() => {
  __setMockIndexSettings({});
});

describe('AnalyzerParameter', () => {
  test('renders built-in SuperSelect for known analyzer values', async () => {
    render(
      <FormWrapper defaultValue={{ analyzer: 'standard' }}>
        <AnalyzerParameter path="analyzer" defaultValue="standard" data-test-subj="indexAnalyzer" />
      </FormWrapper>
    );

    const harness = new EuiSuperSelectTestHarness('indexAnalyzer');
    await waitFor(() => {
      expect(harness.getElement()).toBeInTheDocument();
    });
    expect(harness.getSelected()).toContain('Standard');
    expect(screen.queryByTestId('indexAnalyzer-custom')).not.toBeInTheDocument();
  });

  test('renders custom text input for unknown analyzer values', async () => {
    render(
      <FormWrapper defaultValue={{ analyzer: 'myCustomAnalyzer' }}>
        <AnalyzerParameter
          path="analyzer"
          defaultValue="myCustomAnalyzer"
          data-test-subj="indexAnalyzer"
        />
      </FormWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('indexAnalyzer-custom')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('myCustomAnalyzer')).toBeInTheDocument();
  });

  test('toggles from custom to built-in mode', async () => {
    render(
      <FormWrapper defaultValue={{ analyzer: 'myCustomAnalyzer' }}>
        <AnalyzerParameter
          path="analyzer"
          defaultValue="myCustomAnalyzer"
          data-test-subj="indexAnalyzer"
        />
      </FormWrapper>
    );

    expect(screen.getByTestId('indexAnalyzer-custom')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('indexAnalyzer-toggleCustomButton'));

    await waitFor(() => {
      expect(screen.queryByTestId('indexAnalyzer-custom')).not.toBeInTheDocument();
    });

    const harness = new EuiSuperSelectTestHarness('indexAnalyzer');
    expect(harness.getElement()).toBeInTheDocument();
    expect(harness.getSelected()).toContain('Index default');
  });

  test('toggles from built-in to custom mode', async () => {
    render(
      <FormWrapper defaultValue={{ analyzer: 'standard' }}>
        <AnalyzerParameter path="analyzer" defaultValue="standard" data-test-subj="indexAnalyzer" />
      </FormWrapper>
    );

    const harness = new EuiSuperSelectTestHarness('indexAnalyzer');
    await waitFor(() => {
      expect(harness.getElement()).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('indexAnalyzer-toggleCustomButton'));

    await waitFor(() => {
      expect(screen.getByTestId('indexAnalyzer-custom')).toBeInTheDocument();
    });
  });

  test('renders custom analyzers from index settings as a native select', async () => {
    const indexSettings = {
      analysis: {
        analyzer: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          customAnalyzer_1: { type: 'custom', tokenizer: 'standard' },
          // eslint-disable-next-line @typescript-eslint/naming-convention
          customAnalyzer_2: { type: 'custom', tokenizer: 'standard' },
        },
      },
    };
    __setMockIndexSettings(indexSettings);

    render(
      <FormWrapper defaultValue={{ analyzer: 'customAnalyzer_1' }}>
        <AnalyzerParameter
          path="analyzer"
          defaultValue="customAnalyzer_1"
          data-test-subj="indexAnalyzer"
        />
      </FormWrapper>
    );

    const customSelect = (await waitFor(() => {
      const el = screen.getByDisplayValue('customAnalyzer_1');
      expect(el.tagName).toBe('SELECT');
      return el;
    })) as HTMLSelectElement;
    const options = Array.from(customSelect.options).map((opt) => opt.text);
    expect(options).toEqual(['customAnalyzer_1', 'customAnalyzer_2']);
  });

  test('renders language analyzer sub-select for language values', async () => {
    render(
      <FormWrapper defaultValue={{ analyzer: 'french' }}>
        <AnalyzerParameter path="analyzer" defaultValue="french" data-test-subj="indexAnalyzer" />
      </FormWrapper>
    );

    const harness = new EuiSuperSelectTestHarness('indexAnalyzer');
    await waitFor(() => {
      expect(harness.getSelected()).toContain('Language');
    });

    // The language sub-select is a native select; assert it contains a "french" option.
    const selects = await screen.findAllByTestId('select');
    const nativeSelects = selects.filter((el): el is HTMLSelectElement => el.tagName === 'SELECT');
    const languageSelect = nativeSelects.find((sel) =>
      Array.from(sel.options).some((opt) => opt.value === 'french')
    );
    expect(languageSelect).toBeDefined();
  });
});

describe('AnalyzersParameter', () => {
  test('hides searchAnalyzer when "use same analyzer" checkbox is checked', async () => {
    const field = createMockField();

    render(
      <FormWrapper defaultValue={{ useSameAnalyzerForSearch: true }}>
        <AnalyzersParameter field={field} withSearchQuoteAnalyzer />
      </FormWrapper>
    );

    await screen.findByTestId('analyzerParameters');
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.queryByTestId('searchAnalyzer')).not.toBeInTheDocument();
    expect(screen.getByTestId('analyzerParameters')).toBeInTheDocument();
  });

  test('shows searchAnalyzer when checkbox is unchecked', async () => {
    const field = createMockField();

    render(
      <FormWrapper defaultValue={{ useSameAnalyzerForSearch: true }}>
        <AnalyzersParameter field={field} withSearchQuoteAnalyzer />
      </FormWrapper>
    );

    expect(screen.queryByTestId('searchAnalyzer')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox'));

    await waitFor(() => {
      expect(screen.queryByTestId('searchAnalyzer')).toBeInTheDocument();
    });

    const searchAnalyzerHarness = new EuiSuperSelectTestHarness('searchAnalyzer');
    expect(searchAnalyzerHarness.getSelected()).toContain('Index default');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  test('renders searchQuoteAnalyzer when withSearchQuoteAnalyzer is true', async () => {
    const field = createMockField({ search_quote_analyzer: 'french' });

    render(
      <FormWrapper
        defaultValue={{ useSameAnalyzerForSearch: true, search_quote_analyzer: 'french' }}
      >
        <AnalyzersParameter field={field} withSearchQuoteAnalyzer />
      </FormWrapper>
    );

    await screen.findByTestId('analyzerParameters');
    // Assert the language sub-select is present and includes the expected option.
    const selects = screen.getAllByTestId('select');
    const nativeSelects = selects.filter((el): el is HTMLSelectElement => el.tagName === 'SELECT');
    const languageSelect = nativeSelects.find((sel) =>
      Array.from(sel.options).some((opt) => opt.value === 'french')
    );
    expect(languageSelect).toBeDefined();
  });

  test('does not render searchQuoteAnalyzer when withSearchQuoteAnalyzer is false', async () => {
    const field = createMockField();

    render(
      <FormWrapper defaultValue={{ useSameAnalyzerForSearch: true }}>
        <AnalyzersParameter field={field} withSearchQuoteAnalyzer={false} />
      </FormWrapper>
    );

    await screen.findByTestId('analyzerParameters');
    expect(screen.queryByTestId('searchQuoteAnalyzer')).not.toBeInTheDocument();
  });
});
