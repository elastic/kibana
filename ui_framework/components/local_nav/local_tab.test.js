import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiLocalTab } from './local_tab';

test('renders KuiLocalTab', () => {
  const component = <KuiLocalTab { ...requiredProps }>children</KuiLocalTab>;
  expect(render(component)).toMatchSnapshot();
});

describe('property isSelected', () => {
  test('renders the isSelected modifier', () => {
    const component = <KuiLocalTab isSelected { ...requiredProps }>children</KuiLocalTab>;
    expect(render(component)).toMatchSnapshot();
  });
});

describe('property isDisabled', () => {
  test('renders the isDisabled modifier', () => {
    const component = <KuiLocalTab isDisabled { ...requiredProps }>children</KuiLocalTab>;
    expect(render(component)).toMatchSnapshot();
  });
});
