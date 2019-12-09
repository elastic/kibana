/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let mockSimulate403 = false;
let mockSimulate500 = false;
let mockAreApiKeysEnabled = true;
let mockIsAdmin = true;

const mock403 = () => ({ body: { statusCode: 403 } });
const mock500 = () => ({ body: { error: 'Internal Server Error', message: '', statusCode: 500 } });

jest.mock('../../../../lib/api_keys_api', () => {
  return {
    ApiKeysApi: {
      async checkPrivileges() {
        if (mockSimulate403) {
          throw mock403();
        }

        return {
          isAdmin: mockIsAdmin,
          areApiKeysEnabled: mockAreApiKeysEnabled,
        };
      },
      async getApiKeys() {
        if (mockSimulate500) {
          throw mock500();
        }

        return {
          apiKeys: [
            {
              creation: 1571322182082,
              expiration: 1571408582082,
              id: '0QQZ2m0BO2XZwgJFuWTT',
              invalidated: false,
              name: 'my-api-key',
              realm: 'reserved',
              username: 'elastic',
            },
          ],
        };
      },
    },
  };
});

import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ApiKeysGridPage } from './api_keys_grid_page';
import React from 'react';
import { ReactWrapper } from 'enzyme';
import { EuiCallOut } from '@elastic/eui';

import { NotEnabled } from './not_enabled';
import { PermissionDenied } from './permission_denied';

const waitForRender = async (
  wrapper: ReactWrapper<any>,
  condition: (wrapper: ReactWrapper<any>) => boolean
) => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      await Promise.resolve();
      wrapper.update();
      if (condition(wrapper)) {
        resolve();
      }
    }, 10);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('waitForRender timeout after 2000ms'));
    }, 2000);
  });
};

describe('ApiKeysGridPage', () => {
  beforeEach(() => {
    mockSimulate403 = false;
    mockSimulate500 = false;
    mockAreApiKeysEnabled = true;
    mockIsAdmin = true;
  });

  it('renders a loading state when fetching API keys', async () => {
    const wrapper = mountWithIntl(<ApiKeysGridPage />);

    expect(wrapper.find('[data-test-subj="apiKeysSectionLoading"]')).toHaveLength(1);
  });

  it('renders a callout when API keys are not enabled', async () => {
    mockAreApiKeysEnabled = false;
    const wrapper = mountWithIntl(<ApiKeysGridPage />);

    await waitForRender(wrapper, updatedWrapper => {
      return updatedWrapper.find(NotEnabled).length > 0;
    });

    expect(wrapper.find(NotEnabled)).toMatchSnapshot();
  });

  it('renders permission denied if user does not have required permissions', async () => {
    mockSimulate403 = true;
    const wrapper = mountWithIntl(<ApiKeysGridPage />);

    await waitForRender(wrapper, updatedWrapper => {
      return updatedWrapper.find(PermissionDenied).length > 0;
    });

    expect(wrapper.find(PermissionDenied)).toMatchSnapshot();
  });

  it('renders error callout if error fetching API keys', async () => {
    mockSimulate500 = true;
    const wrapper = mountWithIntl(<ApiKeysGridPage />);

    await waitForRender(wrapper, updatedWrapper => {
      return updatedWrapper.find(EuiCallOut).length > 0;
    });

    expect(wrapper.find('EuiCallOut[data-test-subj="apiKeysError"]')).toHaveLength(1);
  });

  describe('Admin view', () => {
    const wrapper = mountWithIntl(<ApiKeysGridPage />);

    it('renders a callout indicating the user is an administrator', async () => {
      const calloutEl = 'EuiCallOut[data-test-subj="apiKeyAdminDescriptionCallOut"]';

      await waitForRender(wrapper, updatedWrapper => {
        return updatedWrapper.find(calloutEl).length > 0;
      });

      expect(wrapper.find(calloutEl).text()).toEqual('You are an API Key administrator.');
    });

    it('renders the correct description text', async () => {
      const descriptionEl = 'EuiText[data-test-subj="apiKeysDescriptionText"]';

      await waitForRender(wrapper, updatedWrapper => {
        return updatedWrapper.find(descriptionEl).length > 0;
      });

      expect(wrapper.find(descriptionEl).text()).toEqual(
        'View and invalidate API keys. An API key sends requests on behalf of a user.'
      );
    });
  });

  describe('Non-admin view', () => {
    mockIsAdmin = false;
    const wrapper = mountWithIntl(<ApiKeysGridPage />);

    it('does NOT render a callout indicating the user is an administrator', async () => {
      const descriptionEl = 'EuiText[data-test-subj="apiKeysDescriptionText"]';
      const calloutEl = 'EuiCallOut[data-test-subj="apiKeyAdminDescriptionCallOut"]';

      await waitForRender(wrapper, updatedWrapper => {
        return updatedWrapper.find(descriptionEl).length > 0;
      });

      expect(wrapper.find(calloutEl).length).toEqual(0);
    });

    it('renders the correct description text', async () => {
      const descriptionEl = 'EuiText[data-test-subj="apiKeysDescriptionText"]';

      await waitForRender(wrapper, updatedWrapper => {
        return updatedWrapper.find(descriptionEl).length > 0;
      });

      expect(wrapper.find(descriptionEl).text()).toEqual(
        'View and invalidate your API keys. An API key sends requests on your behalf.'
      );
    });
  });
});
