import React from 'react';
import { render, shallow } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../../test/required_props';

import { KuiObjectTitle } from './object_title';

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
