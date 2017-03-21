import React from 'react';
import { shallow } from 'enzyme';
import sinon from 'sinon';

import { KuiButtonGroup } from './button_group';

describe('KuiButtonGroup', () => {
  describe('Baseline', () => {
    test('is rendered', () => {
      const $buttonGroup = shallow(
        <KuiButtonGroup />
      );

      expect($buttonGroup)
        .toMatchSnapshot();
    });
  });

  describe('Props', () => {
    describe('children', () => {
      test('is rendered', () => {
        const $buttonGroup = shallow(
          <KuiButtonGroup>
            Hello
          </KuiButtonGroup>
        );

        expect($buttonGroup)
          .toMatchSnapshot();
      });
    });

    describe('isUnited', () => {
      test('renders the united class', () => {
        const $buttonGroup = shallow(
          <KuiButtonGroup isUnited />
        );

        expect($buttonGroup)
          .toMatchSnapshot();
      });
    });
  });
});
