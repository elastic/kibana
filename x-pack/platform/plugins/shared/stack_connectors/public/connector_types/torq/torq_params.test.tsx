/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import React from 'react';
import TorqParamsFields from './torq_params';

describe('TorqParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      body: 'test message',
    };

    renderWithI18n(
      <TorqParamsFields
        actionParams={actionParams}
        errors={{ body: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );
    // bodyJsonEditor is rendered by JsonEditorWithMessageVariables as a Monaco code editor.
    // The 'value' prop on a Monaco editor is not accessible via the DOM; existence check is sufficient.
    expect(screen.getByTestId('bodyJsonEditor')).toBeInTheDocument();
    expect(screen.getByTestId('bodyAddVariableButton')).toBeInTheDocument();
  });
});
