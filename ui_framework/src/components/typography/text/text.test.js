import React from 'react';
import { render, shallow } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../../test/required_props';

import { KuiText } from './text';

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
