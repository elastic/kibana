/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { Props } from './update_connector';
import { UpdateConnector } from './update_connector';
import { act } from 'react-dom/test-utils';
import { render, waitFor } from '@testing-library/react';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

const mountUpdateConnector = (props: Partial<Props> = {}, isOAuth: boolean = false) => {
  return mountWithIntl(
    <UpdateConnector
      actionTypeId=".servicenow"
      isOAuth={isOAuth}
      updateErrorMessage={null}
      readOnly={false}
      isLoading={false}
      onConfirm={() => {}}
      onCancel={() => {}}
      {...props}
    />
  );
};

// FLAKY: https://github.com/elastic/kibana/issues/209007
describe.skip('UpdateConnector renders', () => {
  it('should render update connector fields', () => {
    const wrapper = mountUpdateConnector();

    expect(wrapper.find('[data-test-subj="snUpdateInstallationCallout"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="updateConnectorForm"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="credentialsApiUrlFromInput"]').exists()).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-username-form-input"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-password-form-input"]').exists()
    ).toBeTruthy();
  });

  it('should render update connector fields for OAuth', () => {
    const wrapper = mountUpdateConnector({}, true);
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-client-id-form-input"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-client-secret-form-input"]').exists()
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-servicenow-user-identifier-form-input"]').exists()
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-servicenow-jwt-key-id-form-input"]').exists()
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-servicenow-private-key-form-input"]').exists()
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-private-key-password-form-input"]')
        .exists()
    ).toBeTruthy();
  });

  it('should disable inputs on loading', async () => {
    const wrapper = mountUpdateConnector({ isLoading: true });

    expect(
      wrapper.find('[data-test-subj="credentialsApiUrlFromInput"]').first().prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-username-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-password-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();
  });

  it('should disable inputs on loading for OAuth', () => {
    const wrapper = mountUpdateConnector({ isLoading: true }, true);

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-client-id-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-client-secret-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-user-identifier-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-jwt-key-id-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-private-key-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-private-key-password-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();
  });

  it('should set inputs as read-only', () => {
    const wrapper = mountUpdateConnector({ readOnly: true });

    expect(
      wrapper.find('[data-test-subj="credentialsApiUrlFromInput"]').first().prop('readOnly')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-username-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-password-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();
  });

  it('should set inputs as read-only for OAuth', () => {
    const wrapper = mountUpdateConnector({ readOnly: true }, true);

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-client-id-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-client-secret-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-user-identifier-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-jwt-key-id-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-private-key-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-private-key-password-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();
  });

  it('should disable submit button on form errors', async () => {
    const wrapper = mountUpdateConnector();

    await act(async () => {
      wrapper.find('button[data-test-subj="snUpdateInstallationSubmit"]').first().simulate('click');
      wrapper.update();
    });

    expect(
      wrapper.find('[data-test-subj="snUpdateInstallationSubmit"]').first().prop('disabled')
    ).toBeTruthy();
  });

  it('should confirm the update when submit button clicked', async () => {
    const onConfirm = jest.fn();

    const { getByTestId } = render(
      <I18nProvider>
        <UpdateConnector
          actionTypeId=".servicenow"
          isOAuth={false}
          updateErrorMessage={null}
          readOnly={false}
          isLoading={false}
          onConfirm={onConfirm}
          onCancel={() => {}}
        />
      </I18nProvider>
    );

    expect(onConfirm).not.toHaveBeenCalled();

    const urlInput = getByTestId('credentialsApiUrlFromInput');
    const usernameInput = getByTestId('connector-servicenow-username-form-input');
    const passwordInput = getByTestId('connector-servicenow-password-form-input');

    await userEvent.type(urlInput, 'https://example.com', { delay: 100 });
    await userEvent.type(usernameInput, 'user', { delay: 100 });
    await userEvent.type(passwordInput, 'pass', { delay: 100 });
    await userEvent.click(getByTestId('snUpdateInstallationSubmit'));

    // Wait for click event to be processed
    await waitFor(() => expect(onConfirm).toHaveBeenCalled(), { timeout: 3000 });

    expect(onConfirm).toHaveBeenCalledWith({
      config: {
        apiUrl: 'https://example.com',
      },
      secrets: {
        password: 'pass',
        username: 'user',
      },
    });
  });

  it('should cancel the update when cancel button clicked', () => {
    const onCancel = jest.fn();
    const wrapper = mountUpdateConnector({ onCancel });

    expect(onCancel).not.toHaveBeenCalled();
    wrapper.find('[data-test-subj="snUpdateInstallationCancel"]').first().simulate('click');
    expect(onCancel).toHaveBeenCalled();
  });

  it('should show error message if present', () => {
    const updateErrorMessage = 'some application error';
    const wrapper = mountUpdateConnector({
      updateErrorMessage,
    });

    expect(wrapper.find('[data-test-subj="snApplicationCallout"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="snApplicationCallout"]').first().text()).toContain(
      updateErrorMessage
    );
  });
});
