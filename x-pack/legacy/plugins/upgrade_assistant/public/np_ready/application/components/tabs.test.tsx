/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

jest.mock('ui/kfetch');

jest.mock('axios', () => ({
  get: jest.fn(),
  create: jest.fn(),
}));

import { UpgradeAssistantTabs } from './tabs';
import { LoadingState } from './types';

import axios from 'axios';
import { OverviewTab } from './tabs/overview';

// Used to wait for promises to resolve and renders to finish before reading updates
const promisesToResolve = () => new Promise(resolve => setTimeout(resolve, 0));

const mockHttp = {
  basePath: {
    prepend: () => 'test',
  },
  fetch() {},
};

describe('UpgradeAssistantTabs', () => {
  test('renders loading state', async () => {
    // @ts-ignore
    axios.get.mockReturnValue(
      new Promise(resolve => {
        /* never resolve */
      })
    );
    const wrapper = mountWithIntl(<UpgradeAssistantTabs http={mockHttp as any} />);
    // Should pass down loading status to child component
    expect(wrapper.find(OverviewTab).prop('loadingState')).toEqual(LoadingState.Loading);
  });

  test('successful data fetch', async () => {
    // @ts-ignore
    axios.get.mockResolvedValue({
      data: {
        cluster: [],
        indices: [],
      },
    });
    const wrapper = mountWithIntl(<UpgradeAssistantTabs http={mockHttp as any} />);
    expect(axios.get).toHaveBeenCalled();
    await promisesToResolve();
    wrapper.update();
    // Should pass down success status to child component
    expect(wrapper.find(OverviewTab).prop('loadingState')).toEqual(LoadingState.Success);
  });

  test('network failure', async () => {
    // @ts-ignore
    axios.get.mockRejectedValue(new Error(`oh no!`));
    const wrapper = mountWithIntl(<UpgradeAssistantTabs http={mockHttp as any} />);
    await promisesToResolve();
    wrapper.update();
    // Should pass down error status to child component
    expect(wrapper.find(OverviewTab).prop('loadingState')).toEqual(LoadingState.Error);
  });

  it('upgrade error', async () => {
    // @ts-ignore
    axios.get.mockRejectedValue({ response: { status: 426 } });
    const wrapper = mountWithIntl(<UpgradeAssistantTabs http={mockHttp as any} />);
    await promisesToResolve();
    wrapper.update();
    // Should display an informative message if the cluster is currently mid-upgrade
    expect(wrapper.find('EuiEmptyPrompt').exists()).toBe(true);
  });
});
