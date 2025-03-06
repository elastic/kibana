/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ConnectorFormTestProvider, waitForComponentToUpdate } from '../lib/test_utils';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TINES_CONNECTOR_ID, TINES_TITLE } from '../../../common/tines/constants';
import TinesConnectorFields from './tines_connector';

const url = 'https://example.com';
const email = 'some.email@test.com';
const token = '123';

const actionConnector = {
  actionTypeId: TINES_CONNECTOR_ID,
  name: TINES_TITLE,
  config: { url },
  secrets: { email, token },
  isDeprecated: false,
};

describe('TinesConnectorFields renders', () => {
  it('should render all fields', async () => {
    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <TinesConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('input[data-test-subj="config.url-input"]').exists()).toBe(true);
    expect(wrapper.find('input[data-test-subj="config.url-input"]').prop('value')).toBe(url);
    expect(wrapper.find('input[data-test-subj="secrets.email-input"]').exists()).toBe(true);
    expect(wrapper.find('input[data-test-subj="secrets.email-input"]').prop('value')).toBe(email);
    expect(wrapper.find('input[data-test-subj="secrets.token-input"]').exists()).toBe(true);
    expect(wrapper.find('input[data-test-subj="secrets.token-input"]').prop('value')).toBe(token);
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should succeed validation when connector config is valid', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <TinesConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: actionConnector,
        isValid: true,
      });
    });

    it('should fail validation when connector secrets are empty', async () => {
      const connector = {
        ...actionConnector,
        secrets: {},
      };

      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <TinesConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });

    it('should fail validation when connector url is empty', async () => {
      const connector = {
        ...actionConnector,
        config: { url: '' },
      };

      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <TinesConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });

    it('should fail validation when connector url is invalid', async () => {
      const connector = {
        ...actionConnector,
        config: { url: 'not a url' },
      };

      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <TinesConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });
  });
});
