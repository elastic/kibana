/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { ToolTipFooter } from './tooltip_footer';

describe('ToolTipFilter', () => {
  let nextFeature = jest.fn();
  let previousFeature = jest.fn();

  beforeEach(() => {
    nextFeature = jest.fn();
    previousFeature = jest.fn();
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <ToolTipFooter
        nextFeature={nextFeature}
        previousFeature={previousFeature}
        featureIndex={0}
        totalFeatures={100}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('previousButton is functioning and nextButton is not when featureIndex is 0', () => {
    const wrapper = mount(
      <ToolTipFooter
        nextFeature={nextFeature}
        previousFeature={previousFeature}
        featureIndex={0}
        totalFeatures={5}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="previous-feature-button"]')
        .first()
        .prop('disabled')
    ).toBe(true);
    wrapper
      .find('[data-test-subj="previous-feature-button"]')
      .first()
      .simulate('click');
    expect(previousFeature).toHaveBeenCalledTimes(0);

    expect(
      wrapper
        .find('[data-test-subj="next-feature-button"]')
        .first()
        .prop('disabled')
    ).toBe(false);
    wrapper
      .find('[data-test-subj="next-feature-button"]')
      .first()
      .simulate('click');
    expect(nextFeature).toHaveBeenCalledTimes(1);
  });

  test('previousButton is functioning and nextButton is functioning when featureIndex > 0 && featureIndex < totalFeatures', () => {
    const wrapper = mount(
      <ToolTipFooter
        nextFeature={nextFeature}
        previousFeature={previousFeature}
        featureIndex={1}
        totalFeatures={5}
      />
    );
    expect(
      wrapper
        .find('[data-test-subj="previous-feature-button"]')
        .first()
        .prop('disabled')
    ).toBe(false);
    wrapper
      .find('[data-test-subj="previous-feature-button"]')
      .first()
      .simulate('click');
    expect(previousFeature).toHaveBeenCalledTimes(1);
    expect(
      wrapper
        .find('[data-test-subj="next-feature-button"]')
        .first()
        .prop('disabled')
    ).toBe(false);
    wrapper
      .find('[data-test-subj="next-feature-button"]')
      .first()
      .simulate('click');
    expect(nextFeature).toHaveBeenCalledTimes(1);
  });

  test('previousButton is functioning and nextButton is not when featureIndex >== totalFeatures', () => {
    const wrapper = mount(
      <ToolTipFooter
        nextFeature={nextFeature}
        previousFeature={previousFeature}
        featureIndex={4}
        totalFeatures={5}
      />
    );
    expect(
      wrapper
        .find('[data-test-subj="previous-feature-button"]')
        .first()
        .prop('disabled')
    ).toBe(false);
    wrapper
      .find('[data-test-subj="previous-feature-button"]')
      .first()
      .simulate('click');
    expect(previousFeature).toHaveBeenCalledTimes(1);
    expect(
      wrapper
        .find('[data-test-subj="next-feature-button"]')
        .first()
        .prop('disabled')
    ).toBe(true);
    wrapper
      .find('[data-test-subj="next-feature-button"]')
      .first()
      .simulate('click');
    expect(nextFeature).toHaveBeenCalledTimes(0);
  });

  test('previousButton and and nextButton are not functioning when only a single feature is provided', () => {
    const wrapper = mount(
      <ToolTipFooter
        nextFeature={nextFeature}
        previousFeature={previousFeature}
        featureIndex={0}
        totalFeatures={1}
      />
    );
    expect(
      wrapper
        .find('[data-test-subj="previous-feature-button"]')
        .first()
        .prop('disabled')
    ).toBe(true);
    wrapper
      .find('[data-test-subj="previous-feature-button"]')
      .first()
      .simulate('click');
    expect(previousFeature).toHaveBeenCalledTimes(0);
    expect(
      wrapper
        .find('[data-test-subj="next-feature-button"]')
        .first()
        .prop('disabled')
    ).toBe(true);
    wrapper
      .find('[data-test-subj="next-feature-button"]')
      .first()
      .simulate('click');
    expect(nextFeature).toHaveBeenCalledTimes(0);
  });
});
