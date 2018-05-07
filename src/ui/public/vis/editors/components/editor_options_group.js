import React from 'react';
import PropTypes from 'prop-types';

import './editor_options_group.less';

import {
  EuiAccordion,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  htmlIdGenerator,
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
      <EuiAccordion
        id={htmlIdGenerator('eog')()}
        initialIsOpen={true}
        extraAction={props.actions}
        buttonContent={
          <EuiTitle size="xs">
            <h2>{props.title}</h2>
          </EuiTitle>
        }
      >
        <EuiSpacer size="m"/>
        { props.children }
      </EuiAccordion>
    </EuiPanel>
  );
}

EditorOptionsGroup.propTypes = {
  /**
   * The title of this options group, which will be shown with the group.
   */
  title: PropTypes.string.isRequired,
  /**
   * Add additional elements as actions to the group.
   */
  actions: PropTypes.node,
  /**
   * All elements that should be within this group.
   */
  children: PropTypes.node.isRequired,
};

export { EditorOptionsGroup };
