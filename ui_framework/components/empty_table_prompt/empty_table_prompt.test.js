import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiEmptyTablePrompt,
} from './empty_table_prompt';

test('renders KuiEmptyTablePrompt', () => {
  const component = <KuiEmptyTablePrompt
    itemType="dashboard"
    promptMessage="You have no dashboards, add one!"
    promptButtonText="Add a new dashboard"
    addHref="#"
    { ...requiredProps }
  />;
  expect(render(component)).toMatchSnapshot();
});
