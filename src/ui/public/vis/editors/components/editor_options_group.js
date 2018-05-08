import React from 'react';
import PropTypes from 'prop-types';

import './editor_options_group.less';

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
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
  const collapsibleOptionGroup = (
    <EuiPanel
      grow={false}
      className={`editorOptionsGroup__panel ${props.className}`}
    >
      <EuiAccordion
        id={htmlIdGenerator('eog')()}
        initialIsOpen={!props.initialIsCollapsed}
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

  const simpleOptionGroup = (
    <EuiPanel
      grow={props.grow}
      className={`editorOptionsGroup__panel ${props.className}`}
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h2>{props.title}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {props.actions}
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m"/>
        </EuiFlexItem>
        <EuiFlexItem>
          { props.children }
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  if (props.collapsible) {
    return collapsibleOptionGroup;
  } else {
    return simpleOptionGroup;
  }
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
   * classNames to append to panel.
   */
  className: PropTypes.string,
  /**
  * Whether the panel should be collapsed by default.
  */
  initialIsCollapsed: PropTypes.bool,
  /**
   * Whether the panel should be collapsible.
   */
  collapsible: PropTypes.bool,
  /**
   * Whether the panel should grow.
   */
  grow: PropTypes.bool,

  /**
   * All elements that should be within this group.
   */
  children: PropTypes.node.isRequired,
};

EditorOptionsGroup.defaultProps = { grow: false, collapsible: true };

export { EditorOptionsGroup };
