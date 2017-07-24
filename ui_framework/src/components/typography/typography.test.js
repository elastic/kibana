import React from 'react';
import { render, shallow } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../../test/required_props';

import {
  KuiLargeTitle,
  KuiMediumTitle,
  KuiSmallTitle,
  KuiText,
} from './typography';

describe('KuiLargeTitle', () => {
  test('is rendered', () => {
    const component = render(
      <KuiLargeTitle { ...requiredProps }>
        <h1>Hello</h1>
      </KuiLargeTitle>
    );

    expect(component)
      .toMatchSnapshot();
  });
});

describe('KuiMediumTitle', () => {
  test('is rendered', () => {
    const component = render(
      <KuiMediumTitle { ...requiredProps }>
        <h1>Hello</h1>
      </KuiMediumTitle>
    );

    expect(component)
      .toMatchSnapshot();
  });
});

describe('KuiSmallTitle', () => {
  test('is rendered', () => {
    const component = render(
      <KuiSmallTitle { ...requiredProps }>
        <h1>Hello</h1>
      </KuiSmallTitle>
    );

    expect(component)
      .toMatchSnapshot();
  });
});

describe('KuiText', () => {
  test('is rendered', () => {
    const component = render(
      <KuiText { ...requiredProps }>
        <h1>Hello</h1>
      </KuiText>
    );

    expect(component)
      .toMatchSnapshot();
  });
});
