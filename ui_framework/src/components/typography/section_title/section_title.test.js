import React from 'react';
import { render, shallow } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../../test/required_props';

import { KuiSectionTitle } from './section_title';

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
