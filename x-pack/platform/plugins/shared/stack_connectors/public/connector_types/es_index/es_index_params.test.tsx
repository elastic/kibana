/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import ParamsFields from './es_index_params';
import { AlertHistoryEsIndexConnectorId } from '@kbn/triggers-actions-ui-plugin/public/types';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

const actionConnector = createMockActionConnector({
  actionTypeId: '.index',
  config: {
    index: 'test-index',
  },
  id: 'es index connector',
  name: 'test name',
});

const preconfiguredActionConnector = createMockActionConnector({
  actionTypeId: '.index',
  id: AlertHistoryEsIndexConnectorId,
  isPreconfigured: true,
  name: 'Alert history Elasticsearch index',
});

describe('IndexParamsFields renders', () => {
  test('all params fields are rendered correctly when params are undefined', () => {
    const actionParams = {
      documents: undefined,
    };
    renderWithI18n(
      <ParamsFields
        actionParams={actionParams}
        errors={{ index: [] }}
        editAction={() => {}}
        index={0}
        actionConnector={actionConnector}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );
    // documentsJsonEditor is rendered by JsonEditorWithMessageVariables (Monaco code editor)
    // The value prop on a Monaco editor cannot be checked via DOM; existence check is sufficient
    expect(screen.getByTestId('documentsJsonEditor')).toBeInTheDocument();
    expect(screen.getByTestId('documentsAddVariableButton')).toBeInTheDocument();
    expect(screen.queryByTestId('preconfiguredIndexToUse')).not.toBeInTheDocument();
    expect(screen.queryByTestId('preconfiguredDocumentToIndex')).not.toBeInTheDocument();
  });

  test('all params fields are rendered when document params are defined', () => {
    const actionParams = {
      documents: [{ test: 123 }],
    };

    renderWithI18n(
      <ParamsFields
        actionParams={actionParams}
        errors={{ index: [] }}
        editAction={() => {}}
        index={0}
        actionConnector={actionConnector}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );
    // documentsJsonEditor is a Monaco code editor; value prop is not accessible via DOM
    expect(screen.getByTestId('documentsJsonEditor')).toBeInTheDocument();
    expect(screen.getByTestId('documentsAddVariableButton')).toBeInTheDocument();
    expect(screen.queryByTestId('preconfiguredIndexToUse')).not.toBeInTheDocument();
    expect(screen.queryByTestId('preconfiguredDocumentToIndex')).not.toBeInTheDocument();
  });

  test('all params fields are rendered correctly for preconfigured alert history connector when params are undefined', () => {
    const actionParams = {
      documents: undefined,
    };
    renderWithI18n(
      <ParamsFields
        actionParams={actionParams}
        errors={{ index: [] }}
        editAction={() => {}}
        index={0}
        actionConnector={preconfiguredActionConnector}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );
    expect(screen.queryByTestId('documentsJsonEditor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('documentsAddVariableButton')).not.toBeInTheDocument();
    const preconfiguredIndexToUse = screen.getByTestId(
      'preconfiguredIndexToUse'
    ) as HTMLInputElement;
    expect(preconfiguredIndexToUse).toBeInTheDocument();
    expect(preconfiguredIndexToUse).toHaveValue('default');
    expect(screen.getByTestId('preconfiguredDocumentToIndex')).toBeInTheDocument();
  });

  test('all params fields are rendered correctly for preconfigured alert history connector when params are defined', async () => {
    const actionParams = {
      documents: undefined,
      indexOverride: 'kibana-alert-history-not-the-default',
    };
    const editAction = jest.fn();
    renderWithI18n(
      <ParamsFields
        actionParams={actionParams}
        errors={{ index: [] }}
        editAction={editAction}
        index={0}
        actionConnector={preconfiguredActionConnector}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );
    expect(screen.queryByTestId('documentsJsonEditor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('documentsAddVariableButton')).not.toBeInTheDocument();
    const preconfiguredIndexToUse = screen.getByTestId(
      'preconfiguredIndexToUse'
    ) as HTMLInputElement;
    expect(preconfiguredIndexToUse).toBeInTheDocument();
    expect(preconfiguredIndexToUse).toHaveValue('not-the-default');
    expect(screen.getByTestId('preconfiguredDocumentToIndex')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('resetDefaultIndex'));

    expect(editAction).toHaveBeenCalledWith(
      'indexOverride',
      expect.stringContaining('kibana-alert-history-'),
      0
    );
  });
});
