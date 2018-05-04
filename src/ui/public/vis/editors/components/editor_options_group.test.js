import React from 'react';
import { render } from 'enzyme';

import { EditorOptionsGroup } from './editor_options_group';

describe('<EditorOptionsGroup/>', () => {
  it('renders as expected', () => {
    const group = render(
      <EditorOptionsGroup
        title="Some options"
      >
        <span>Children</span>
        <span>within the editor group</span>
      </EditorOptionsGroup>
    );
    expect(group).toMatchSnapshot();
  });
});
