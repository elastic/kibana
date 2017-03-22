import React from 'react';
import {
  shallow,
  render,
} from 'enzyme';
import sinon from 'sinon';

import {
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
      describe('create', () => {
        test('renders the create class', () => {
          const $buttonIcon = render(
            <KuiButtonIcon type={KuiButtonIcon.TYPE.CREATE} />
          );

          expect($buttonIcon)
            .toMatchSnapshot();
        });
      });

      describe('delete', () => {
        test('renders the delete class', () => {
          const $buttonIcon = render(
            <KuiButtonIcon type={KuiButtonIcon.TYPE.DELETE} />
          );

          expect($buttonIcon)
            .toMatchSnapshot();
        });
      });

      describe('previous', () => {
        test('renders the previous class', () => {
          const $buttonIcon = render(
            <KuiButtonIcon type={KuiButtonIcon.TYPE.PREVIOUS} />
          );

          expect($buttonIcon)
            .toMatchSnapshot();
        });
      });

      describe('next', () => {
        test('renders the next class', () => {
          const $buttonIcon = render(
            <KuiButtonIcon type={KuiButtonIcon.TYPE.NEXT} />
          );

          expect($buttonIcon)
            .toMatchSnapshot();
        });
      });

      describe('loading', () => {
        test('renders the loading class', () => {
          const $buttonIcon = render(
            <KuiButtonIcon type={KuiButtonIcon.TYPE.LOADING} />
          );

          expect($buttonIcon)
            .toMatchSnapshot();
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
