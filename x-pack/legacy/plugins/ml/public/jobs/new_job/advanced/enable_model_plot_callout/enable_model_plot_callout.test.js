/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { EnableModelPlotCallout } from './enable_model_plot_callout_view.js';

const message = 'Test message';

describe('EnableModelPlotCallout', () => {

  test('Callout is rendered correctly with message', () => {
    const wrapper = mountWithIntl(<EnableModelPlotCallout message={message} />);
    const calloutText = wrapper.find('EuiText');

    expect(calloutText.text()).toBe(message);
  });

});
