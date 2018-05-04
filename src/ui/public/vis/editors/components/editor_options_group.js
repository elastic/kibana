import React from 'react';
import PropTypes from 'prop-types';

import './editor_options_group.less';

import {
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';


/**
 * A component to group different options in an editor together and give them
 * a title. Should be used for all visualize editors when grouping options,
 * to produce an aligned look and feel.
 */
function EditorOptionsGroup(props) {
  return (
    <EuiPanel
      grow={false}
      className="editorOptionsGroup__panel"
    >
      <EuiTitle size="xs">
        <h2>{props.title}</h2>
      </EuiTitle>
      <EuiSpacer size="m"/>
      { props.children }
    </EuiPanel>
  );
}

EditorOptionsGroup.propTypes = {
  /**
   * The title of this options group, which will be shown with the group.
   */
  title: PropTypes.string.isRequired,
  /**
   * All elements that should be within this group.
   */
  children: PropTypes.node.isRequired,
};

export { EditorOptionsGroup };
