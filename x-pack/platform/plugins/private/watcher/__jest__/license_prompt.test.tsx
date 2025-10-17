/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import type {
  LicenseManagementLocator,
  LicenseManagementLocatorParams,
} from '@kbn/license-management-plugin/public/locator';
import { LicensePrompt } from '../public/application/license_prompt';

describe('License prompt', () => {
  test('renders a prompt with a link to License Management', () => {
    const locator = {
      ...sharePluginMock.createLocator(),
      useUrl: (params: LicenseManagementLocatorParams) => '/license_management',
    } as LicenseManagementLocator;
    const component = shallow(
      <LicensePrompt message="License error" licenseManagementLocator={locator} />
    );

    expect(component).toMatchSnapshot();
  });

  test('renders a prompt without a link to License Management', () => {
    const component = shallow(<LicensePrompt message="License error" />);

    expect(component).toMatchSnapshot();
  });
});
