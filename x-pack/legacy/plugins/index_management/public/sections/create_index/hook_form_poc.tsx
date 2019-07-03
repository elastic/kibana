/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';

import { Form1 } from './form_1';
import { Form2 } from './form_2';
import { Form3 } from './form_3';

export const HookFormPOC = () => {
  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1>POC Hook Form..</h1>
        </EuiTitle>

        <EuiSpacer size="l" />
        <Form1 />
        <EuiSpacer size="xl" />
        <hr />

        <EuiSpacer size="xl" />
        <Form2 />
        <EuiSpacer size="xl" />
        <hr />

        <EuiSpacer size="xl" />
        <Form3 />
        <EuiSpacer size="xl" />
        <hr />

        <EuiSpacer size="xl" />
        <Form3
          title="4. Same form but with initilal values"
          defaultValues={{
            name: 'hello world',
            elastic: {
              coWorkers: [
                { firstName: 'Sébastien', lastName: 'Loix' },
                { firstName: 'CJ', lastName: 'Cenizal' },
              ],
            },
            nested: {
              prop: 'Some value',
            },
            indexName: 'good',
            selectedIndices: ['index_3'],
          }}
        />
        <EuiSpacer size="xl" />
      </EuiPageContent>
    </EuiPageBody>
  );
};
