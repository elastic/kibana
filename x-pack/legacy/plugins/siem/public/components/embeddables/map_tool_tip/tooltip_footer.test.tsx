/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';
import { ToolTipFooterComponent } from './tooltip_footer';

describe('ToolTipFilter', () => {
  let nextFeature = jest.fn();
  let previousFeature = jest.fn();

  beforeEach(() => {
    nextFeature = jest.fn();
    previousFeature = jest.fn();
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <ToolTipFooterComponent
        featureIndex={0}
        nextFeature={nextFeature}
        previousFeature={previousFeature}
        totalFeatures={100}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  describe('Lower bounds', () => {
    test('previousButton is disabled when featureIndex is 0', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={0}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={5}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="previous-feature-button"]')
          .first()
          .prop('disabled')
      ).toBe(true);
    });

    test('previousFeature is not called when featureIndex is 0', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={0}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={5}
        />
      );

      wrapper
        .find('[data-test-subj="previous-feature-button"]')
        .first()
        .simulate('click');
      expect(previousFeature).toHaveBeenCalledTimes(0);
    });

    test('nextButton is enabled when featureIndex is < totalFeatures', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={0}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={5}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="next-feature-button"]')
          .first()
          .prop('disabled')
      ).toBe(false);
    });

    test('nextFeature is called when featureIndex is < totalFeatures', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={0}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={5}
        />
      );

      wrapper
        .find('[data-test-subj="next-feature-button"]')
        .first()
        .simulate('click');
      expect(nextFeature).toHaveBeenCalledTimes(1);
    });
  });

  describe('Upper bounds', () => {
    test('previousButton is enabled when featureIndex >== totalFeatures', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={4}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={5}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="previous-feature-button"]')
          .first()
          .prop('disabled')
      ).toBe(false);
    });

    test('previousFunction is called when featureIndex >== totalFeatures', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={4}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={5}
        />
      );

      wrapper
        .find('[data-test-subj="previous-feature-button"]')
        .first()
        .simulate('click');
      expect(previousFeature).toHaveBeenCalledTimes(1);
    });

    test('nextButton is disabled when featureIndex >== totalFeatures', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={4}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={5}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="next-feature-button"]')
          .first()
          .prop('disabled')
      ).toBe(true);
    });

    test('nextFunction is not called when featureIndex >== totalFeatures', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={4}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={5}
        />
      );
      wrapper
        .find('[data-test-subj="next-feature-button"]')
        .first()
        .simulate('click');
      expect(nextFeature).toHaveBeenCalledTimes(0);
    });
  });

  describe('Within bounds, single feature', () => {
    test('previousButton is not enabled when only a single feature is provided', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={0}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={1}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="previous-feature-button"]')
          .first()
          .prop('disabled')
      ).toBe(true);
    });

    test('previousFunction is not called when only a single feature is provided', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={0}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={1}
        />
      );

      wrapper
        .find('[data-test-subj="previous-feature-button"]')
        .first()
        .simulate('click');
      expect(previousFeature).toHaveBeenCalledTimes(0);
    });

    test('nextButton is not enabled when only a single feature is provided', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={0}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={1}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="next-feature-button"]')
          .first()
          .prop('disabled')
      ).toBe(true);
    });

    test('nextFunction is not called when only a single feature is provided', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={0}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={1}
        />
      );

      wrapper
        .find('[data-test-subj="next-feature-button"]')
        .first()
        .simulate('click');
      expect(nextFeature).toHaveBeenCalledTimes(0);
    });
  });

  describe('Within bounds, multiple features', () => {
    test('previousButton is enabled when featureIndex > 0 && featureIndex < totalFeatures', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={1}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={5}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="previous-feature-button"]')
          .first()
          .prop('disabled')
      ).toBe(false);
    });

    test('previousFunction is called when featureIndex > 0 && featureIndex < totalFeatures', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={1}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={5}
        />
      );

      wrapper
        .find('[data-test-subj="previous-feature-button"]')
        .first()
        .simulate('click');
      expect(previousFeature).toHaveBeenCalledTimes(1);
    });

    test('nextButton is enabled when featureIndex > 0 && featureIndex < totalFeatures', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={1}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={5}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="next-feature-button"]')
          .first()
          .prop('disabled')
      ).toBe(false);
    });

    test('nextFunction is called when featureIndex > 0 && featureIndex < totalFeatures', () => {
      const wrapper = mount(
        <ToolTipFooterComponent
          featureIndex={1}
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          totalFeatures={5}
        />
      );

      wrapper
        .find('[data-test-subj="next-feature-button"]')
        .first()
        .simulate('click');
      expect(nextFeature).toHaveBeenCalledTimes(1);
    });
  });
});
