/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EsqlEditorField, EDITOR_HEIGHT_INLINE, EDITOR_HEIGHT_DEFAULT } from './esql_editor_field';
import { createFormWrapper } from '../../test_utils';

// Mock the CodeEditorField component
jest.mock('@kbn/code-editor', () => ({
  CodeEditorField: ({
    value,
    onChange,
    placeholder,
    dataTestSubj,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    dataTestSubj?: string;
  }) => (
    <textarea
      data-test-subj={dataTestSubj}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

describe('EsqlEditorField', () => {
  it('renders with form context value', () => {
    render(<EsqlEditorField name="evaluation.query.base" dataTestSubj="test-editor" />, {
      wrapper: createFormWrapper({
        evaluation: { query: { base: 'FROM logs-*' } },
      }),
    });

    expect(screen.getByTestId('test-editor')).toHaveValue('FROM logs-*');
  });

  it('renders with empty value when form field is empty', () => {
    render(<EsqlEditorField name="evaluation.query.base" dataTestSubj="test-editor" />, {
      wrapper: createFormWrapper({
        evaluation: { query: { base: '' } },
      }),
    });

    expect(screen.getByTestId('test-editor')).toHaveValue('');
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

  it('renders placeholder when provided', () => {
    render(
      <EsqlEditorField
        name="evaluation.query.base"
        placeholder="FROM logs-* | WHERE ..."
        dataTestSubj="test-editor"
      />,
      {
        wrapper: createFormWrapper({}),
      }
    );

    expect(screen.getByTestId('test-editor')).toHaveAttribute(
      'placeholder',
      'FROM logs-* | WHERE ...'
    );
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
