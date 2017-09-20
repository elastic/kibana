import React from 'react';
import { render } from 'enzyme';

import { KuiGlobalToastListItem } from './global_toast_list_item';

describe('KuiGlobalToastListItem', () => {
  test('is rendered', () => {
    const component = render(
      <KuiGlobalToastListItem>
        <div>Hi</div>
      </KuiGlobalToastListItem>
    );

    expect(component)
      .toMatchSnapshot();
  });
});
