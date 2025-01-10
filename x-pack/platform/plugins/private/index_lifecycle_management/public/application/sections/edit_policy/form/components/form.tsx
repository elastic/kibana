/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import type { FormHook } from '../../../../../shared_imports';
import { Form as LibForm } from '../../../../../shared_imports';

import { ConfigurationProvider } from '../configuration_context';
import { FormErrorsProvider } from '../form_errors_context';
import { PhaseTimingsProvider } from '../phase_timings_context';
import { GlobalFieldsProvider } from '../global_fields_context';

interface Props {
  form: FormHook;
  children: React.ReactNode;
}

export const Form: FunctionComponent<Props> = ({ form, children }) => {
  return (
    <LibForm form={form}>
      <ConfigurationProvider>
        <FormErrorsProvider>
          <GlobalFieldsProvider>
            <PhaseTimingsProvider>{children}</PhaseTimingsProvider>
          </GlobalFieldsProvider>
        </FormErrorsProvider>
      </ConfigurationProvider>
    </LibForm>
  );
};
