/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, waitFor, render, within } from '@testing-library/react';
import type { EuiComboBoxProps } from '@elastic/eui';
import IndexActionConnectorFields from './es_index_connector';
import type { AppMockRenderer } from '../lib/test_utils';
import { ConnectorFormTestProvider, createAppMockRenderer } from '../lib/test_utils';
import userEvent from '@testing-library/user-event';

// Capture the EuiComboBox onChange so tests can simulate index selection
let latestComboBoxOnChange: EuiComboBoxProps<string>['onChange'] | undefined;
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiComboBox: (props: EuiComboBoxProps<string>) => {
      if (props['data-test-subj'] === 'connectorIndexesComboBox') {
        latestComboBoxOnChange = props.onChange;
      }
      return <actual.EuiComboBox {...props} />;
    },
  };
});

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api', () => ({
  ...jest.requireActual(
    '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api'
  ),
  checkConnectorIdAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
}));

jest.mock('lodash', () => {
  const module = jest.requireActual('lodash');
  return {
    ...module,
    debounce: (fn: () => unknown) => fn,
  };
});

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/index_controls', () => ({
  firstFieldOption: {
    text: 'Select a field',
    value: '',
  },
  getFields: jest.fn(),
  getIndexOptions: jest.fn(),
}));

const { getIndexOptions } = jest.requireMock(
  '@kbn/triggers-actions-ui-plugin/public/common/index_controls'
);

const { getFields } = jest.requireMock(
  '@kbn/triggers-actions-ui-plugin/public/common/index_controls'
);

const ILLEGAL_INDEX_CHARACTERS = ['\\', '/', '?', '"', '<', '>', '|', '#', ',', ':'];

function setupGetFieldsResponse(getFieldsWithDateMapping: boolean) {
  getFields.mockResolvedValueOnce([
    {
      type: getFieldsWithDateMapping ? 'date' : 'keyword',
      name: 'test1',
    },
    {
      type: 'text',
      name: 'test2',
    },
  ]);
}

describe('IndexActionConnectorFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly when creating connector', async () => {
    const connector = {
      actionTypeId: '.index',
      isDeprecated: false,
      config: {},
      secrets: {},
    };

    render(
      <ConnectorFormTestProvider connector={connector}>
        <IndexActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('connectorIndexesComboBox')).toBeInTheDocument();

    expect(screen.queryByTestId('hasTimeFieldCheckbox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executionTimeFieldSelect')).not.toBeInTheDocument();
  });

  test('renders correctly when editing connector - no date type field mapping', async () => {
    const indexName = 'index-no-date-fields';
    const props = {
      name: 'Index Connector for Index With No Date Type',
      actionTypeId: '.index',
      isDeprecated: false,
      config: {
        index: indexName,
        refresh: false,
      },
      secrets: {},
    };

    setupGetFieldsResponse(false);
    render(
      <ConnectorFormTestProvider connector={props}>
        <IndexActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await screen.findByTestId('connectorIndexesComboBox');

    expect(screen.queryByTestId('hasTimeFieldCheckbox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executionTimeFieldSelect')).not.toBeInTheDocument();

    const comboInput = within(screen.getByTestId('connectorIndexesComboBox')).getByRole('combobox');
    expect(comboInput).toHaveValue(indexName);
  });

  test('renders correctly when editing connector - refresh set to true', async () => {
    const indexName = 'index-no-date-fields';
    const props = {
      name: 'Index Connector for Index With No Date Type',
      actionTypeId: '.index',
      isDeprecated: false,
      config: {
        index: indexName,
        refresh: true,
      },
      secrets: {},
    };

    setupGetFieldsResponse(false);
    render(
      <ConnectorFormTestProvider connector={props}>
        <IndexActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await screen.findByTestId('connectorIndexesComboBox');
    expect(screen.queryByTestId('hasTimeFieldCheckbox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executionTimeFieldSelect')).not.toBeInTheDocument();
  });

  test('renders correctly when editing connector - with date type field mapping but no time field selected', async () => {
    const indexName = 'index-no-date-fields';
    const props = {
      name: 'Index Connector for Index With No Date Type',
      actionTypeId: '.index',
      isDeprecated: false,
      config: {
        index: indexName,
        refresh: false,
      },
      secrets: {},
    };

    setupGetFieldsResponse(true);
    render(
      <ConnectorFormTestProvider connector={props}>
        <IndexActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(await screen.findByTestId('hasTimeFieldCheckbox')).toBeInTheDocument();
    expect(screen.getByTestId('connectorIndexesComboBox')).toBeInTheDocument();
    expect(screen.queryByTestId('executionTimeFieldSelect')).not.toBeInTheDocument();
    expect(screen.getByTestId('hasTimeFieldCheckbox')).not.toBeChecked();
  });

  test('renders correctly when editing connector - with date type field mapping and selected time field', async () => {
    const indexName = 'index-no-date-fields';
    const props = {
      name: 'Index Connector for Index With No Date Type',
      actionTypeId: '.index',
      isDeprecated: false,
      config: {
        index: indexName,
        refresh: false,
        executionTimeField: 'test1',
      },
      secrets: {},
    };

    setupGetFieldsResponse(true);
    render(
      <ConnectorFormTestProvider connector={props}>
        <IndexActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(await screen.findByTestId('hasTimeFieldCheckbox')).toBeInTheDocument();
    expect(screen.getByTestId('connectorIndexesComboBox')).toBeInTheDocument();
    expect(screen.getByTestId('executionTimeFieldSelect')).toBeInTheDocument();

    const switchEl = screen.getByTestId('hasTimeFieldCheckbox');
    expect(switchEl).toBeChecked();

    expect(screen.getByTestId('executionTimeFieldSelect')).toHaveValue('test1');
  });

  test('time field checkbox appears and disappears based on index date field mapping', async () => {
    const connector = {
      actionTypeId: '.index',
      isDeprecated: false,
      config: {},
      secrets: {},
    };

    render(
      <ConnectorFormTestProvider connector={connector}>
        <IndexActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await screen.findByTestId('connectorIndexesComboBox');

    expect(screen.queryByTestId('hasTimeFieldCheckbox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executionTimeFieldSelect')).not.toBeInTheDocument();

    setupGetFieldsResponse(true);
    await act(async () => {
      latestComboBoxOnChange!([{ label: 'selection', value: 'selection' }]);
    });

    await waitFor(() => {
      expect(screen.getByTestId('hasTimeFieldCheckbox')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('executionTimeFieldSelect')).not.toBeInTheDocument();

    setupGetFieldsResponse(false);
    await act(async () => {
      latestComboBoxOnChange!([{ label: 'selection', value: 'selection' }]);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('hasTimeFieldCheckbox')).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId('executionTimeFieldSelect')).not.toBeInTheDocument();

    setupGetFieldsResponse(true);
    await act(async () => {
      latestComboBoxOnChange!([{ label: 'selection', value: 'selection' }]);
    });

    await waitFor(() => {
      expect(screen.getByTestId('hasTimeFieldCheckbox')).toBeInTheDocument();
    });
    expect(screen.getByTestId('hasTimeFieldCheckbox')).not.toBeChecked();
    expect(screen.queryByTestId('executionTimeFieldSelect')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('hasTimeFieldCheckbox'));

    expect(screen.getByTestId('hasTimeFieldCheckbox')).toBeChecked();
    expect(screen.getByTestId('executionTimeFieldSelect')).toBeInTheDocument();
  });

  test('fetches index names on index combobox input change', async () => {
    const mockIndexName = 'test-index';
    const connector = {
      actionTypeId: '.index',
      name: 'index',
      isDeprecated: false,
      config: {},
      secrets: {},
    };

    getIndexOptions.mockResolvedValueOnce([
      {
        label: 'indexOption',
        options: [
          { label: 'indexPattern1', value: 'indexPattern1' },
          { label: 'indexPattern2', value: 'indexPattern2' },
        ],
      },
    ]);

    render(
      <ConnectorFormTestProvider connector={connector}>
        <IndexActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    const indexComboBox = await screen.findByTestId('connectorIndexesComboBox');

    setupGetFieldsResponse(true);

    const searchInput = within(indexComboBox).getByRole('combobox');
    await userEvent.click(searchInput);
    await userEvent.paste(mockIndexName);

    expect(getIndexOptions).toHaveBeenCalledTimes(1);
    expect(getIndexOptions).toHaveBeenCalledWith(expect.anything(), mockIndexName);
    expect(await screen.findAllByRole('option')).toHaveLength(2);
    expect(screen.getByText('indexPattern1')).toBeInTheDocument();
    expect(screen.getByText('indexPattern2')).toBeInTheDocument();
  });

  describe('Validation', () => {
    let appMockRenderer: AppMockRenderer;
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      appMockRenderer = createAppMockRenderer();
    });

    test('connector validation succeeds when connector config is valid', async () => {
      const actionConnector = {
        secrets: {},
        id: 'es-index',
        actionTypeId: '.index',
        name: 'es_index',
        config: {
          index: 'test_es_index',
          refresh: false,
          executionTimeField: '1',
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <IndexActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {
            actionTypeId: '.index',
            config: {
              index: 'test_es_index',
              executionTimeField: '1',
              refresh: false,
            },
            id: 'es-index',
            isDeprecated: false,
            __internal__: {
              hasTimeFieldCheckbox: true,
            },
            name: 'es_index',
          },
          isValid: true,
        });
      });
    });

    test('connector validation succeeds when connector config is valid with minimal config', async () => {
      const actionConnector = {
        secrets: {},
        id: 'es-index',
        actionTypeId: '.index',
        name: 'es_index',
        config: {
          index: 'test_es_index',
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <IndexActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {
            actionTypeId: '.index',
            config: {
              index: 'test_es_index',
            },
            id: 'es-index',
            isDeprecated: false,
            name: 'es_index',
          },
          isValid: true,
        });
      });
    });

    test('connector validation fails when index is empty', async () => {
      const actionConnector = {
        secrets: {},
        id: 'test',
        actionTypeId: '.index',
        name: 'es_index',
        config: {
          index: '',
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <IndexActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
        });
      });
    });

    test('connector validation fails when index contains empty spaces', async () => {
      const actionConnector = {
        secrets: {},
        id: 'test',
        actionTypeId: '.index',
        name: 'es_index',
        config: {
          index: 'test index',
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <IndexActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
        });
      });

      expect(
        await screen.findByText('The index pattern cannot contain spaces.')
      ).toBeInTheDocument();
    });

    test('connector validation fails when wildcards (*) index patterns', async () => {
      const actionConnector = {
        secrets: {},
        id: 'test',
        actionTypeId: '.index',
        name: 'es_index',
        config: {
          index: 'index*',
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <IndexActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
        });
      });

      expect(
        await screen.findByText('The index pattern cannot contain wildcards (*).')
      ).toBeInTheDocument();
    });

    test.each(ILLEGAL_INDEX_CHARACTERS)(
      'connector validation fails when index contains invalid character "%s"',
      async (char) => {
        const actionConnector = {
          secrets: {},
          id: 'test',
          actionTypeId: '.index',
          name: 'es_index',
          config: {
            index: `test${char}index`,
          },
          isDeprecated: false,
        };

        appMockRenderer.render(
          <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
            <IndexActionConnectorFields
              readOnly={false}
              isEdit={false}
              registerPreSubmitValidator={() => {}}
            />
          </ConnectorFormTestProvider>
        );

        await userEvent.click(screen.getByTestId('form-test-provide-submit'));

        await waitFor(() => {
          expect(onSubmit).toBeCalledWith({
            data: {},
            isValid: false,
          });
        });

        expect(
          await screen.findByText(`The index pattern contains the invalid character ${char}.`)
        ).toBeInTheDocument();
      }
    );

    test('connector validation fails when index name contains uppercase letters', async () => {
      const actionConnector = {
        secrets: {},
        id: 'test',
        actionTypeId: '.index',
        name: 'es_index',
        config: {
          index: 'TestIndex',
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <IndexActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
        });
      });

      expect(await screen.findByText('The index pattern must be lowercase.')).toBeInTheDocument();
    });

    test.each(['-', '_', '+'])(
      'connector validation fails when index starts with "%s"',
      async (char) => {
        const actionConnector = {
          secrets: {},
          id: 'test',
          actionTypeId: '.index',
          name: 'es_index',
          config: {
            index: `${char}index`,
          },
          isDeprecated: false,
        };

        appMockRenderer.render(
          <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
            <IndexActionConnectorFields
              readOnly={false}
              isEdit={false}
              registerPreSubmitValidator={() => {}}
            />
          </ConnectorFormTestProvider>
        );

        await userEvent.click(screen.getByTestId('form-test-provide-submit'));

        await waitFor(() => {
          expect(onSubmit).toBeCalledWith({
            data: {},
            isValid: false,
          });
        });

        expect(
          await screen.findByText(`The index pattern cannot start with ${char}.`)
        ).toBeInTheDocument();
      }
    );

    test.each(['.', '..'])('connector validation fails when index name is "%s"', async (char) => {
      const actionConnector = {
        secrets: {},
        id: 'test',
        actionTypeId: '.index',
        name: 'es_index',
        config: {
          index: `${char}`,
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <IndexActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
        });
      });

      expect(await screen.findByText(`The index pattern cannot be ${char}`)).toBeInTheDocument();
    });

    test('connector validation fails when index exceeds 255 bytes', async () => {
      const actionConnector = {
        secrets: {},
        id: 'test',
        actionTypeId: '.index',
        name: 'es_index',
        config: {
          index: 'a'.repeat(256),
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <IndexActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
        });
      });

      expect(
        await screen.findByText('The index pattern cannot be longer than 255.')
      ).toBeInTheDocument();
    });
  });
});
