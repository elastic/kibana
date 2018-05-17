import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';

class InspectorModes extends Component {

  state = {
    isSelectorOpen: false
  };

  toggleSelector = () => {
    this.setState((prev) => ({
      isSelectorOpen: !prev.isSelectorOpen
    }));
  };

  closeSelector = () => {
    this.setState({
      isSelectorOpen: false
    });
  };

  renderMode = (mode, index) => {
    return (
      <EuiContextMenuItem
        key={index}
        icon={mode.icon || 'empty'}
        onClick={() => {
          this.props.onModeSelected(mode);
          this.closeSelector();
        }}
        data-test-subj={`inspectorViewChooser${mode.title}`}
      >
        {mode.title}
      </EuiContextMenuItem>
    );
  }

  render() {
    const { selectedMode, modes } = this.props;
    const triggerButton = (
      <EuiButtonEmpty
        size="l"
        iconType="arrowDown"
        iconSide="right"
        data-test-subj="inspectorViewChooser"
        onClick={this.toggleSelector}
      >
        { selectedMode.icon &&
          <EuiIcon
            type={selectedMode.icon}
            size="m"
            className="inspector-modes__icon"
            aria-hidden="true"
          />
        }
        { this.props.selectedMode.title }
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        id="inspectorModeSelector"
        ownFocus
        button={triggerButton}
        isOpen={this.state.isSelectorOpen}
        closePopover={this.closeSelector}
        panelPaddingSize="none"
        anchorPosition="downCenter"
        withTitle
      >
        <EuiPopoverTitle>Select mode</EuiPopoverTitle>
        <EuiContextMenuPanel
          items={modes.map(this.renderMode)}
        />
      </EuiPopover>
    );
  }
}

InspectorModes.propTypes = {
  modes: PropTypes.array.isRequired,
  onModeSelected: PropTypes.func.isRequired,
  selectedMode: PropTypes.object.isRequired,
};

export { InspectorModes };
