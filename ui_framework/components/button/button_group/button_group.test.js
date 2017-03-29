import React from 'react';
import { render } from 'enzyme';

import { KuiButtonGroup } from './button_group';

describe('KuiButtonGroup', () => {
  describe('Baseline', () => {
    test('is rendered', () => {
      const $buttonGroup = render(
        <KuiButtonGroup />
      );

      expect($buttonGroup)
        .toMatchSnapshot();
    });
  });

  describe('Props', () => {
    describe('children', () => {
      test('is rendered', () => {
        const $buttonGroup = render(
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
        const $buttonGroup = render(
          <KuiButtonGroup isUnited />
        );

        expect($buttonGroup)
          .toMatchSnapshot();
      });
    });
  });
});
