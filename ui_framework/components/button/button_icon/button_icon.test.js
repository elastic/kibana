import React from 'react';
import {
  shallow,
  render,
} from 'enzyme';
import sinon from 'sinon';

import {
  ICON_TYPES,
  KuiButtonIcon,
} from './button_icon';

describe('KuiButtonIcon', () => {
  describe('Baseline', () => {
    test('is rendered', () => {
      const $buttonIcon = shallow(
        <KuiButtonIcon />
      );

      expect($buttonIcon)
        .toMatchSnapshot();
    });
  });

  describe('Props', () => {
    describe('type', () => {
      ICON_TYPES.forEach(type => {
        describe(type, () => {
          test(`renders the ${type} class`, () => {
            const $buttonIcon = render(<KuiButtonIcon type={ type } />);
            expect($buttonIcon).toMatchSnapshot();
          });
        });
      });
    });

    describe('className', () => {
      test('renders the classes', () => {
        const $buttonIcon = shallow(
          <KuiButtonIcon className="testClass1 testClass2" />
        );

        expect($buttonIcon)
          .toMatchSnapshot();
      });
    });
  });
});
