import React from 'react';
import sinon from 'sinon';
import { render, mount } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiPagerButtonGroup,
} from './pager_button_group';

let onNext;
let onPrevious;

beforeEach(() => {
  onNext = sinon.spy();
  onPrevious = sinon.spy();
});

test('renders KuiPagerButtonGroup', () => {
  const component = <KuiPagerButtonGroup
    onNext={onNext}
    onPrevious={onPrevious}
    hasNext={true}
    hasPrevious={true}
    { ...requiredProps }/>;
  expect(render(component)).toMatchSnapshot();
});

describe('property', () => {

  function findPreviousButton(pager) {
    return pager.find('[data-test-subj="pagerPreviousButton"]');
  }

  function findNextButton(pager) {
    return pager.find('[data-test-subj="pagerNextButton"]');
  }

  test('onNext', () => {
    const component = <KuiPagerButtonGroup
      onNext={onNext}
      onPrevious={onPrevious}
      hasNext={true}
      hasPrevious={true}
      />;
    const pager = mount(component);
    findNextButton(pager).simulate('click');
    sinon.assert.calledOnce(onNext);
    sinon.assert.notCalled(onPrevious);
  });

  test('onPrevious', () => {
    const component = <KuiPagerButtonGroup
      onNext={onNext}
      onPrevious={onPrevious}
      hasNext={true}
      hasPrevious={true}
    />;
    const pager = mount(component);
    findPreviousButton(pager).simulate('click');
    sinon.assert.calledOnce(onPrevious);
    sinon.assert.notCalled(onNext);
  });

  describe('hasNext', () => {
    test('is enabled when true', () => {
      const component = <KuiPagerButtonGroup
        onNext={onNext}
        onPrevious={onPrevious}
        hasNext={true}
        hasPrevious={true}
      />;
      const pager = mount(component);
      const isDisabled = findNextButton(pager).prop('disabled');
      expect(isDisabled).toBe(false);
    });

    test('is disabled when false', () => {
      const component = <KuiPagerButtonGroup
        onNext={onNext}
        onPrevious={onPrevious}
        hasNext={false}
        hasPrevious={true}
      />;
      const pager = mount(component);
      const isDisabled = findNextButton(pager).prop('disabled');
      expect(isDisabled).toBe(true);
    });
  });

  describe('hasPrevious', () => {
    test('is enabled when true', () => {
      const component = <KuiPagerButtonGroup
        onNext={onNext}
        onPrevious={onPrevious}
        hasNext={true}
        hasPrevious={true}
      />;
      const pager = mount(component);
      const isDisabled = findPreviousButton(pager).prop('disabled');
      expect(isDisabled).toBe(false);
    });

    test('is disabled when false', () => {
      const component = <KuiPagerButtonGroup
        onNext={onNext}
        onPrevious={onPrevious}
        hasNext={true}
        hasPrevious={false}
      />;
      const pager = mount(component);
      const isDisabled = findPreviousButton(pager).prop('disabled');
      expect(isDisabled).toBe(true);
    });
  });
});
