import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiPromptForItemsMessage,
} from './prompt_for_items_message';

test('renders KuiPromptForItemsMessage', () => {
  const component = <KuiPromptForItemsMessage { ...requiredProps }>children</KuiPromptForItemsMessage>;
  expect(render(component)).toMatchSnapshot();
});
