import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiPromptForItems,
} from './prompt_for_items';

test('renders KuiPromptForItems', () => {
  const component = <KuiPromptForItems
    itemType="dashboard"
    promptMessage="You have no dashboards, add one!"
    promptButtonText="Add a new dashboard"
    addHref="#"
    { ...requiredProps }
  />;
  expect(render(component)).toMatchSnapshot();
});
