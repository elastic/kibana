/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mount } from 'enzyme';
import moment from 'moment-timezone';
import * as React from 'react';

import { LocalizedDateTooltip } from '.';

describe('LocalizedDateTooltip', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  moment.locale('en');
  const date = moment('2019-02-19 04:21:00');

  const sampleContentText =
    'this content is typically the string representation of the date prop, but can be any valid react child';

  const SampleContent = () => <span data-test-subj="sample-content">{sampleContentText}</span>;

  test('it renders the child content', () => {
    const wrapper = mount(
      <LocalizedDateTooltip date={date.toDate()}>
        <SampleContent />
      </LocalizedDateTooltip>
    );

    expect(wrapper.find('[data-test-subj="sample-content"]').exists()).toEqual(true);
  });

  test('it renders', () => {
    const wrapper = mount(
      <LocalizedDateTooltip date={date.toDate()}>
        <SampleContent />
      </LocalizedDateTooltip>
    );

    expect(wrapper.find('[data-test-subj="localized-date-tool-tip"]').exists()).toEqual(true);
  });
});
