import React from 'react';
import { render, shallow } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../../test/required_props';

import { KuiPageTitle } from './page_title';

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
