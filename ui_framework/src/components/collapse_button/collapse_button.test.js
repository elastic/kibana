import React from 'react';
import { render, shallow } from 'enzyme';
import { requiredProps } from '../../test/required_props';
import sinon from 'sinon';

import {
  DIRECTIONS,
  KuiCollapseButton,
} from './collapse_button';

describe('KuiCollapseButton', () => {
  describe('Props', () => {
    describe('direction', () => {
      DIRECTIONS.forEach(direction => {
        describe(direction, () => {
          test(`renders the ${direction} class`, () => {
            const component = <KuiCollapseButton direction={direction} {...requiredProps}/>;
            expect(render(component)).toMatchSnapshot();
          });
        });
      });
    });

    describe('onClick', () => {
      test(`isn't called upon instantiation`, () => {
        const onClickHandler = sinon.stub();

        shallow(
          <KuiCollapseButton direction="left" onClick={onClickHandler} />
        );

        sinon.assert.notCalled(onClickHandler);
      });

      test('is called when the button is clicked', () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(
          <KuiCollapseButton direction="left" onClick={onClickHandler} />
        );

        $button.simulate('click');

        sinon.assert.calledOnce(onClickHandler);
      });
    });
  });
});
