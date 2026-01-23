/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { within } from '@testing-library/react';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiButton } from '@elastic/eui';

/**
 * Convenience utility to remove text appended to links by EUI
 */
export const removeExternalLinkText = (str: string | null) =>
  str?.replace(/\(external[^)]*\)/g, '');

export const waitForComponentToUpdate = async () =>
  act(async () => {
    return Promise.resolve();
  });

export interface FormTestComponentProps {
  formDefaultValue?: Record<string, unknown>;
  onSubmit?: jest.Mock;
  schema?: FormSchema<Record<string, unknown>>;
  children: React.ReactNode;
}

// eslint-disable-next-line react/display-name
export const FormTestComponent: FC<PropsWithChildren<FormTestComponentProps>> = ({
  children,
  onSubmit,
  formDefaultValue,
  schema,
}) => {
  const { form } = useForm({ onSubmit, defaultValue: formDefaultValue, schema });

  return (
    <Form form={form}>
      {children}
      <EuiButton onClick={() => form.submit()} data-test-subj="form-test-component-submit-button">
        {'Submit'}
      </EuiButton>
    </Form>
  );
};

export function tableMatchesExpectedContent({
  expectedContent,
  tableRows,
}: {
  expectedContent: string[][];
  tableRows: HTMLElement[];
}) {
  expect(tableRows).toHaveLength(expectedContent.length);

  tableRows.forEach((row, index) => {
    const expected = expectedContent[index];
    expected.forEach((content) => {
      expect(within(row).getByText(content));
    });
  });
}
