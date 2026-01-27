/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { screen, fireEvent, waitFor, render } from '@testing-library/react';
import IndexActionConnectorFields from './es_index_connector';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiComboBox, EuiSwitch, EuiSelect } from '@elastic/eui';
import type { AppMockRenderer } from '../lib/test_utils';
import { ConnectorFormTestProvider, createAppMockRenderer } from '../lib/test_utils';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

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

getIndexOptions.mockResolvedValueOnce([
  {
    label: 'indexOption',
    options: [
      { label: 'indexPattern1', value: 'indexPattern1' },
      { label: 'indexPattern2', value: 'indexPattern2' },
    ],
  },
]);

const { getFields } = jest.requireMock(
  '@kbn/triggers-actions-ui-plugin/public/common/index_controls'
);

const ILLEGAL_INDEX_CHARACTERS = ['\\', '/', '?', '"', '<', '>', '|', '#', ',', ':'];

async function setup(actionConnector: any) {
  const wrapper = mountWithIntl(
    <ConnectorFormTestProvider connector={actionConnector}>
      <IndexActionConnectorFields
        readOnly={false}
        isEdit={false}
        registerPreSubmitValidator={() => {}}
      />
    </ConnectorFormTestProvider>
  );

  await act(async () => {
    await nextTick();
    wrapper.update();
  });

  return wrapper;
}

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
  test('renders correctly when creating connector', async () => {
    const connector = {
      actionTypeId: '.index',
      config: {},
      secrets: {},
    };

    setupGetFieldsResponse(false);
    const wrapper = await setup(connector);

    expect(wrapper.find('[data-test-subj="connectorIndexesComboBox"]').exists()).toBeTruthy();

    // time field switch shouldn't show up initially
    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeFalsy();

    const indexComboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="connectorIndexesComboBox"]');

    // time field switch should show up if index has date type field mapping
    setupGetFieldsResponse(true);
    await act(async () => {
      indexComboBox.prop('onChange')!([{ label: 'selection', value: 'selection' }]);
      await nextTick();
      wrapper.update();
    });

    wrapper.update();
    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeFalsy();

    // time field switch should show up if index has date type field mapping
    // time field switch should go away if index does not has date type field mapping
    setupGetFieldsResponse(false);
    await act(async () => {
      indexComboBox.prop('onChange')!([{ label: 'selection', value: 'selection' }]);
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeFalsy();

    // time field dropdown should show up if index has date type field mapping and time switch is clicked
    setupGetFieldsResponse(true);
    await act(async () => {
      indexComboBox.prop('onChange')!([{ label: 'selection', value: 'selection' }]);
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeTruthy();

    const timeFieldSwitch = wrapper
      .find(EuiSwitch)
      .filter('[data-test-subj="hasTimeFieldCheckbox"]');

    await act(async () => {
      timeFieldSwitch.prop('onChange')!({
        target: { checked: true },
      } as unknown as EuiSwitchEvent);
      await nextTick();
      wrapper.update();
    });

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeTruthy();
    });
  });

  test('renders correctly when editing connector - no date type field mapping', async () => {
    const indexName = 'index-no-date-fields';
    const props = {
      name: 'Index Connector for Index With No Date Type',
      actionTypeId: '.index',
      config: {
        index: indexName,
        refresh: false,
      },
      secrets: {},
    };

    setupGetFieldsResponse(false);
    const wrapper = await setup(props);

    expect(wrapper.find('[data-test-subj="connectorIndexesComboBox"]').exists()).toBeTruthy();

    // time related fields shouldn't show up
    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeFalsy();

    const indexComboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="connectorIndexesComboBox"]');
    expect(indexComboBox.prop('selectedOptions')).toEqual([{ label: indexName, value: indexName }]);
  });

  test('renders correctly when editing connector - refresh set to true', async () => {
    const indexName = 'index-no-date-fields';
    const props = {
      name: 'Index Connector for Index With No Date Type',
      actionTypeId: '.index',
      config: {
        index: indexName,
        refresh: true,
      },
      secrets: {},
    };

    setupGetFieldsResponse(false);
    const wrapper = await setup(props);

    expect(wrapper.find('[data-test-subj="connectorIndexesComboBox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeFalsy();

    const indexComboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="connectorIndexesComboBox"]');
    expect(indexComboBox.prop('selectedOptions')).toEqual([{ label: indexName, value: indexName }]);
  });

  test('renders correctly when editing connector - with date type field mapping but no time field selected', async () => {
    const indexName = 'index-no-date-fields';
    const props = {
      name: 'Index Connector for Index With No Date Type',
      actionTypeId: '.index',
      config: {
        index: indexName,
        refresh: false,
      },
      secrets: {},
    };

    setupGetFieldsResponse(true);
    const wrapper = await setup(props);

    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="connectorIndexesComboBox"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeFalsy();
    });

    const indexComboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="connectorIndexesComboBox"]');
    expect(indexComboBox.prop('selectedOptions')).toEqual([{ label: indexName, value: indexName }]);

    const timeFieldSwitch = wrapper
      .find(EuiSwitch)
      .filter('[data-test-subj="hasTimeFieldCheckbox"]');
    expect(timeFieldSwitch.prop('checked')).toEqual(false);
  });

  test('renders correctly when editing connector - with date type field mapping and selected time field', async () => {
    const indexName = 'index-no-date-fields';
    const props = {
      name: 'Index Connector for Index With No Date Type',
      actionTypeId: '.index',
      config: {
        index: indexName,
        refresh: false,
        executionTimeField: 'test1',
      },
    };

    setupGetFieldsResponse(true);
    const wrapper = await setup(props);

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find('[data-test-subj="connectorIndexesComboBox"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeTruthy();
    });

    const indexComboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="connectorIndexesComboBox"]');
    expect(indexComboBox.prop('selectedOptions')).toEqual([{ label: indexName, value: indexName }]);

    const timeFieldSwitch = wrapper
      .find(EuiSwitch)
      .filter('[data-test-subj="hasTimeFieldCheckbox"]');
    expect(timeFieldSwitch.prop('checked')).toEqual(true);

    const timeFieldSelect = wrapper
      .find(EuiSelect)
      .filter('[data-test-subj="executionTimeFieldSelect"]');
    expect(timeFieldSelect.prop('value')).toEqual('test1');
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

    // time field switch should show up if index has date type field mapping
    setupGetFieldsResponse(true);

    fireEvent.click(indexComboBox);

    await act(async () => {
      const event = { target: { value: mockIndexName } };
      fireEvent.change(screen.getByRole('combobox'), event);
    });

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
        id: 'test',
        actionTypeId: '.index',
        name: 'es_index',
        config: {
          index: 'test_es_index',
          refresh: false,
          executionTimeField: '1',
        },
        isDeprecated: false,
      };

      const { getByTestId } = appMockRenderer.render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <IndexActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(getByTestId('form-test-provide-submit'));

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.index',
          config: {
            index: 'test_es_index',
            executionTimeField: '1',
            refresh: false,
          },
          id: 'test',
          isDeprecated: false,
          __internal__: {
            hasTimeFieldCheckbox: true,
          },
          name: 'es_index',
        },
        isValid: true,
      });
    });

    test('connector validation succeeds when connector config is valid with minimal config', async () => {
      const actionConnector = {
        secrets: {},
        id: 'test',
        actionTypeId: '.index',
        name: 'es_index',
        config: {
          index: 'test_es_index',
        },
        isDeprecated: false,
      };

      const { getByTestId } = appMockRenderer.render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <IndexActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(getByTestId('form-test-provide-submit'));

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.index',
          config: {
            index: 'test_es_index',
          },
          id: 'test',
          isDeprecated: false,
          name: 'es_index',
        },
        isValid: true,
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

      const { getByTestId } = appMockRenderer.render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <IndexActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(getByTestId('form-test-provide-submit'));

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
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

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
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

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
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

        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
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

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
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

        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
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

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
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

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });

      expect(
        await screen.findByText('The index pattern cannot be longer than 255.')
      ).toBeInTheDocument();
    });
  });
});
