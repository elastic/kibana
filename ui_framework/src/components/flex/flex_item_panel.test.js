import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFlexItemPanel } from './flex_item_panel';

describe('KuiFlexItemPanel', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFlexItemPanel {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
