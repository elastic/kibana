/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import moment from 'moment-timezone';
import React from 'react';

import { LocalizedDateTooltip } from '.';
import { TestProviders } from '../../common/mock';

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
      <TestProviders>
        <LocalizedDateTooltip date={date.toDate()}>
          <SampleContent />
        </LocalizedDateTooltip>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="sample-content"]').exists()).toEqual(true);
  });

  test('it renders', () => {
    const wrapper = mount(
      <TestProviders>
        <LocalizedDateTooltip date={date.toDate()}>
          <SampleContent />
        </LocalizedDateTooltip>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="localized-date-tool-tip"]').exists()).toEqual(true);
  });
});
