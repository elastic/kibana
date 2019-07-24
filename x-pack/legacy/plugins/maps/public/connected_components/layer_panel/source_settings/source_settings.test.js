/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SourceSettings } from './source_settings';

test('Should render source settings editor', () => {
  const mockLayer = {
    renderSourceSettingsEditor: () => {
      return (<div>mockSourceEditor</div>);
    },
  };
  const component = shallow(
    <SourceSettings
      layer={mockLayer}
    />
  );

  expect(component)
    .toMatchSnapshot();
});

test('should render nothing when source has no editor', () => {
  const mockLayer = {
    renderSourceSettingsEditor: () => {
      return null;
    },
  };
  const component = shallow(
    <SourceSettings
      layer={mockLayer}
    />
  );

  expect(component)
    .toMatchSnapshot();
});
