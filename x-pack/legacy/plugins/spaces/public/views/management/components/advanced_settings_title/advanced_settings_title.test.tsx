/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { AdvancedSettingsTitle } from './advanced_settings_title';
import { SpaceAvatar } from '../../../../components';

describe('AdvancedSettingsTitle', () => {
  it('renders without crashing', async () => {
    const space = {
      id: 'my-space',
      name: 'My Space',
      disabledFeatures: [],
    };

    const wrapper = mountWithIntl(
      <AdvancedSettingsTitle getActiveSpace={() => Promise.resolve(space)} />
    );

    await Promise.resolve();
    await Promise.resolve();
    wrapper.update();
    expect(wrapper.find(SpaceAvatar)).toHaveLength(1);
  });
});
