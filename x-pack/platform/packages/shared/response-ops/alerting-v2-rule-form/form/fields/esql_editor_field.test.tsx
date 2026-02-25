/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EsqlEditorField, EDITOR_HEIGHT_INLINE, EDITOR_HEIGHT_DEFAULT } from './esql_editor_field';
import { createFormWrapper } from '../../test_utils';
import type { AggregateQuery } from '@kbn/es-query';

// Mock the ESQLLangEditor component from @kbn/esql/public
jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    query,
    onTextLangQueryChange,
    errors,
    warning,
    isDisabled,
    dataTestSubj,
  }: {
    query: AggregateQuery;
    onTextLangQueryChange: (query: AggregateQuery) => void;
    errors?: Error[];
    warning?: string;
    isDisabled?: boolean;
    dataTestSubj?: string;
  }) => (
    <div data-test-subj={dataTestSubj}>
      <textarea
        data-test-subj={`${dataTestSubj}-input`}
        value={query.esql}
        onChange={(e) => onTextLangQueryChange({ esql: e.target.value })}
        disabled={isDisabled}
      />
      {errors?.map((error, i) => (
        <div key={i} data-test-subj={`${dataTestSubj}-error`}>
          {error.message}
        </div>
      ))}
      {warning && <div data-test-subj={`${dataTestSubj}-warning`}>{warning}</div>}
    </div>
  ),
}));

describe('EsqlEditorField', () => {
  it('renders with form context value', () => {
    render(<EsqlEditorField name="evaluation.query.base" dataTestSubj="test-editor" />, {
      wrapper: createFormWrapper({
        evaluation: { query: { base: 'FROM logs-*' } },
      }),
    });

    expect(screen.getByTestId('test-editor-editor-input')).toHaveValue('FROM logs-*');
  });

  it('renders with empty value when form field is empty', () => {
    render(<EsqlEditorField name="evaluation.query.base" dataTestSubj="test-editor" />, {
      wrapper: createFormWrapper({
        evaluation: { query: { base: '' } },
      }),
    });

    expect(screen.getByTestId('test-editor-editor-input')).toHaveValue('');
  });

  it('renders label', () => {
    render(<EsqlEditorField name="evaluation.query.base" label="ES|QL Query" />, {
      wrapper: createFormWrapper({}),
    });

    expect(screen.getByText('ES|QL Query')).toBeInTheDocument();
  });

  it('renders label with tooltip when labelTooltip is provided', () => {
    render(
      <EsqlEditorField
        name="evaluation.query.base"
        label="Query"
        labelTooltip="This is a tooltip"
      />,
      {
        wrapper: createFormWrapper({}),
      }
    );

    expect(screen.getByText('Query')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('renders help text when provided', () => {
    render(<EsqlEditorField name="evaluation.query.base" helpText="Enter an ES|QL query" />, {
      wrapper: createFormWrapper({}),
    });

    expect(screen.getByText('Enter an ES|QL query')).toBeInTheDocument();
  });

  it('updates form value on change', () => {
    render(<EsqlEditorField name="evaluation.query.base" dataTestSubj="test-editor" />, {
      wrapper: createFormWrapper({
        evaluation: { query: { base: 'FROM logs-*' } },
      }),
    });

    const input = screen.getByTestId('test-editor-editor-input');
    fireEvent.change(input, { target: { value: 'FROM metrics-*' } });

    expect(input).toHaveValue('FROM metrics-*');
  });

  it('displays server errors when provided', () => {
    const serverError = new Error('Query execution failed');
    render(
      <EsqlEditorField
        name="evaluation.query.base"
        dataTestSubj="test-editor"
        errors={[serverError]}
      />,
      {
        wrapper: createFormWrapper({
          evaluation: { query: { base: 'FROM logs-*' } },
        }),
      }
    );

    expect(screen.getByTestId('test-editor-editor-error')).toHaveTextContent(
      'Query execution failed'
    );
  });

  it('displays server warnings when provided', () => {
    render(
      <EsqlEditorField
        name="evaluation.query.base"
        dataTestSubj="test-editor"
        warning="Query is deprecated"
      />,
      {
        wrapper: createFormWrapper({
          evaluation: { query: { base: 'FROM logs-*' } },
        }),
      }
    );

    expect(screen.getByTestId('test-editor-editor-warning')).toHaveTextContent(
      'Query is deprecated'
    );
  });

  it('disables editor when disabled prop is true', () => {
    render(
      <EsqlEditorField name="evaluation.query.base" dataTestSubj="test-editor" disabled={true} />,
      {
        wrapper: createFormWrapper({
          evaluation: { query: { base: 'FROM logs-*' } },
        }),
      }
    );

    expect(screen.getByTestId('test-editor-editor-input')).toBeDisabled();
  });

  it('disables editor when readOnly prop is true', () => {
    render(
      <EsqlEditorField name="evaluation.query.base" dataTestSubj="test-editor" readOnly={true} />,
      {
        wrapper: createFormWrapper({
          evaluation: { query: { base: 'FROM logs-*' } },
        }),
      }
    );

    expect(screen.getByTestId('test-editor-editor-input')).toBeDisabled();
  });

  describe('exported constants', () => {
    it('exports EDITOR_HEIGHT_INLINE as 140', () => {
      expect(EDITOR_HEIGHT_INLINE).toBe(140);
    });

    it('exports EDITOR_HEIGHT_DEFAULT as 80', () => {
      expect(EDITOR_HEIGHT_DEFAULT).toBe(80);
    });
  });
});
