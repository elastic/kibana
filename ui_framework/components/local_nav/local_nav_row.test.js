import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiLocalNavRow } from './local_nav_row';

test('renders KuiLocalNavRow', () => {
  const component = <KuiLocalNavRow { ...requiredProps }>children</KuiLocalNavRow>;
  expect(render(component)).toMatchSnapshot();
});

describe('property isSecondary', () => {
  test('renders the secondary modifier', () => {
    const component = <KuiLocalNavRow isSecondary { ...requiredProps }>children</KuiLocalNavRow>;
    expect(render(component)).toMatchSnapshot();
  });
});
