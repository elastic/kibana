import React from 'react';
import sinon from 'sinon';
import { render, mount } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiPager,
} from './pager';

let onPreviousPage;
let onNextPage;

beforeEach(() => {
  onPreviousPage = sinon.spy();
  onNextPage = sinon.spy();
});

test('renders KuiPager', () => {
  const component = <KuiPager
    hasPreviousPage={false}
    hasNextPage={true}
    onPreviousPage={onPreviousPage}
    onNextPage={onNextPage}
    startNumber={1}
    endNumber={10}
    totalItems={20}
    { ...requiredProps }/>;
  expect(render(component)).toMatchSnapshot();
});

describe('property', () => {
  describe('hasPreviousPage', () => {
    test('disables previous button when false', () => {
      const component = <KuiPager
        hasPreviousPage={false}
        hasNextPage={true}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
        startNumber={1}
        endNumber={10}
        totalItems={20}/>;
      expect(render(component)).toMatchSnapshot();
    });
  });

  describe('hasNextPage', () => {
    test('disables next button when false', () => {
      const component = <KuiPager
        hasPreviousPage={true}
        hasNextPage={false}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
        startNumber={1}
        endNumber={10}
        totalItems={20}/>;
      expect(render(component)).toMatchSnapshot();
    });
  });

  describe('onPreviousPage', () => {
    test('is called when clicked', () => {
      const component = <KuiPager
        hasPreviousPage={true}
        hasNextPage={true}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
        startNumber={1}
        endNumber={10}
        totalItems={20}/>;
      const pager = mount(component);
      pager.find('[data-test-subj="pagerPreviousButton"]').simulate('click');
      sinon.assert.calledOnce(onPreviousPage);
      sinon.assert.notCalled(onNextPage);
    });
  });

  describe('onNextPage', () => {
    test('is called when clicked', () => {
      const component = <KuiPager
        hasPreviousPage={true}
        hasNextPage={true}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
        startNumber={1}
        endNumber={10}
        totalItems={20}/>;
      const pager = mount(component);
      pager.find('[data-test-subj="pagerNextButton"]').simulate('click');
      sinon.assert.calledOnce(onNextPage);
      sinon.assert.notCalled(onPreviousPage);
    });
  });
});
