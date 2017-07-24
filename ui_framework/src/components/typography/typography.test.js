import React from 'react';
import { render, shallow } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../../test/required_props';

import {
  KuiPageTitle,
  KuiSectionTitle,
  KuiObjectTitle,
  KuiText,
} from './typography';

describe('KuiPageTitle', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPageTitle { ...requiredProps }>
        <h1>Hello</h1>
      </KuiPageTitle>
    );

    expect(component)
      .toMatchSnapshot();
  });
});

describe('KuiSectionTitle', () => {
  test('is rendered', () => {
    const component = render(
      <KuiSectionTitle { ...requiredProps }>
        <h1>Hello</h1>
      </KuiSectionTitle>
    );

    expect(component)
      .toMatchSnapshot();
  });
});

describe('KuiObjectTitle', () => {
  test('is rendered', () => {
    const component = render(
      <KuiObjectTitle { ...requiredProps }>
        <h1>Hello</h1>
      </KuiObjectTitle>
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
