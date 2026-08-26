/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { Form, useForm } from '../../../shared_imports';
import { TYPE_ONLY_ALLOWED_AT_ROOT_LEVEL } from '../../../constants';
import { TypeParameter } from './type_parameter';

jest.mock('../../../../../services/documentation', () => ({
  documentationService: {
    getTypeDocLink: (type: string) => `/docs/${type}`,
  },
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  return {
    ...actual,
    EuiComboBox: ({
      options,
      'data-test-subj': dataTestSubj,
      selectedOptions,
    }: {
      options: Array<{ value: string }>;
      'data-test-subj'?: string;
      selectedOptions: Array<{ value: string; label: string }>;
      onChange: (opts: Array<{ value: string; label: string }>) => void;
      inputRef?: (input: HTMLInputElement | null) => void;
    }) => (
      <div data-test-subj={dataTestSubj}>
        <div data-test-subj="mockComboBoxOptions">{options.map((o) => o.value).join(',')}</div>
        <div data-test-subj="mockComboBoxSelected">
          {selectedOptions.map((o) => o.value).join(',')}
        </div>
      </div>
    ),
  };
});

const FormWrapper = ({
  children,
  defaultValue = {},
}: {
  children: React.ReactNode;
  defaultValue?: Record<string, unknown>;
}) => {
  const { form } = useForm({ defaultValue });
  return (
    <I18nProvider>
      <Form form={form}>{children}</Form>
    </I18nProvider>
  );
};

describe('TypeParameter', () => {
  describe('WHEN isSemanticTextEnabled is false', () => {
    it('SHOULD filter out the semantic_text option', async () => {
      render(
        <FormWrapper defaultValue={{ type: 'text' }}>
          <TypeParameter isRootLevelField showDocLink={false} isSemanticTextEnabled={false} />
        </FormWrapper>
      );

      const optionsText = await screen.findByTestId('mockComboBoxOptions');
      expect(optionsText.textContent).not.toContain('semantic_text');
    });
  });

  describe('WHEN isRootLevelField is false', () => {
    it('SHOULD filter out root-only types', async () => {
      render(
        <FormWrapper defaultValue={{ type: 'text' }}>
          <TypeParameter isRootLevelField={false} showDocLink={false} isSemanticTextEnabled />
        </FormWrapper>
      );

      const optionsText = await screen.findByTestId('mockComboBoxOptions');
      for (const rootOnlyType of TYPE_ONLY_ALLOWED_AT_ROOT_LEVEL) {
        expect(optionsText.textContent).not.toContain(rootOnlyType);
      }
    });
  });

  describe('WHEN showDocLink is true and a type is selected', () => {
    it('SHOULD render the documentation link', async () => {
      render(
        <FormWrapper defaultValue={{ type: 'text' }}>
          <TypeParameter isRootLevelField showDocLink isSemanticTextEnabled />
        </FormWrapper>
      );

      const link = await screen.findByRole('link');
      expect(link).toHaveAttribute('href', '/docs/text');
      expect(link.textContent).toContain('documentation');
    });
  });
});
