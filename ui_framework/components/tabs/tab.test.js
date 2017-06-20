import React from 'react';
import { render, shallow } from 'enzyme';
import { requiredProps } from '../../test/required_props';
import sinon from 'sinon';

import {
  KuiTab,
} from './tab';

describe('KuiTab', () => {
  test('renders', () => {
    const component = <KuiTab { ...requiredProps }>children</KuiTab>;
    expect(render(component)).toMatchSnapshot();
  });

  test('renders isSelected', () => {
    const component = <KuiTab isSelected { ...requiredProps }>children</KuiTab>;
    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    describe('onClick', () => {
      test(`isn't called upon instantiation`, () => {
        const onClickHandler = sinon.stub();

        shallow(
          <KuiTab onClick={onClickHandler} />
        );

        sinon.assert.notCalled(onClickHandler);
      });

      test('is called when the button is clicked', () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(
          <KuiTab onClick={onClickHandler} />
        );

        $button.simulate('click');

        sinon.assert.calledOnce(onClickHandler);
      });
    });
  });
});
