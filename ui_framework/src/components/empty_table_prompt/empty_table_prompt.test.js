import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiEmptyTablePrompt,
} from './empty_table_prompt';

import {
  KuiButtonIcon,
  KuiLinkButton,
} from '../button';

test('renders KuiEmptyTablePrompt', () => {
  const component = (<KuiEmptyTablePrompt
    actions={
      <KuiLinkButton
        icon={<KuiButtonIcon type="create"/>}
        aria-label="Add a new item"
        data-test-subj="addNewPromptButton"
        buttonType="primary"
        href="#"
      >
        Add a new item
      </KuiLinkButton>
    }
    message="Uh oh, You have no items!"
    {...requiredProps}
  />);
  expect(render(component)).toMatchSnapshot();
});
