import React from 'react';
import { render, shallow } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../test/required_props';

import { KuiHeader } from './header';

describe('KuiHeader', () => {
  test('is rendered', () => {
    const component = render(
      <KuiHeader { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
