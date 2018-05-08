import React from 'react';
import { render } from 'enzyme';

import 'test_utils/static_html_id_generator';

import { EuiButtonIcon } from '@elastic/eui';
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

  it('renders as expected with actions', () => {
    const group = render(
      <EditorOptionsGroup
        title="Some actions"
        actions={
          <EuiButtonIcon
            iconType="trash"
            color="text"
            aria-label="Remove"
          />
        }
      >
        <span>Some children</span>
      </EditorOptionsGroup>
    );
    expect(group).toMatchSnapshot();
  });

  it('renders as expected with initial collapsed', () => {
    const group = render(
      <EditorOptionsGroup
        title="Some options"
        initialIsCollapsed={true}
      >
        <span>Children</span>
        <span>within the editor group</span>
      </EditorOptionsGroup>
    );
    expect(group).toMatchSnapshot();
  });
});
