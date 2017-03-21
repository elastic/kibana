import React from 'react';
import {
  shallow,
  render,
} from 'enzyme';
import sinon from 'sinon';

import {
  KuiButtonIcon,
  KuiCreateButtonIcon,
  KuiDeleteButtonIcon,
  KuiPreviousButtonIcon,
  KuiNextButtonIcon,
  KuiLoadingButtonIcon,
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

describe('KuiCreateButtonIcon', () => {
  test('is rendered with create class', () => {
    const $buttonIcon = render(
      <KuiCreateButtonIcon />
    );

    expect($buttonIcon)
      .toMatchSnapshot();
  });
});

describe('KuiDeleteButtonIcon', () => {
  test('is rendered with delete class', () => {
    const $buttonIcon = render(
      <KuiDeleteButtonIcon />
    );

    expect($buttonIcon)
      .toMatchSnapshot();
  });
});

describe('KuiPreviousButtonIcon', () => {
  test('is rendered with previous class', () => {
    const $buttonIcon = render(
      <KuiPreviousButtonIcon />
    );

    expect($buttonIcon)
      .toMatchSnapshot();
  });
});

describe('KuiNextButtonIcon', () => {
  test('is rendered with next class', () => {
    const $buttonIcon = render(
      <KuiNextButtonIcon />
    );

    expect($buttonIcon)
      .toMatchSnapshot();
  });
});

describe('KuiLoadingButtonIcon', () => {
  test('is rendered with loading class', () => {
    const $buttonIcon = render(
      <KuiLoadingButtonIcon />
    );

    expect($buttonIcon)
      .toMatchSnapshot();
  });
});
