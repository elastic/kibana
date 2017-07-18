import React from 'react';
import { render, shallow } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../test/required_props';

import { <%= componentName %> } from './<%= fileName %>';

describe('<%= componentName %>', () => {
  test('is rendered', () => {
    const component = render(
      <<%= componentName %> { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
