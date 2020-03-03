/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { RuleDownloaderComponent } from './index';

describe('RuleDownloader', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <RuleDownloaderComponent filename={'export_rules.ndjson'} onExportComplete={jest.fn()} />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
