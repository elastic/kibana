import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButtonEmpty,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItemButton,
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
      <EuiKeyPadMenuItemButton
        key={index}
        label={mode.title}
        onClick={() => {
          this.props.onModeSelected(mode);
          this.closeSelector();
        }}
      >
        <EuiIcon
          aria-hidden="true"
          type={mode.icon || 'empty'}
          size="l"
        />
      </EuiKeyPadMenuItemButton>
    );
  }

  render() {
    const { selectedMode, modes } = this.props;
    const triggerButton = (
      <EuiButtonEmpty
        size="l"
        iconType="arrowDown"
        iconSide="right"
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
        withTitle
      >
        <EuiPopoverTitle>Select inspector mode</EuiPopoverTitle>
        <EuiKeyPadMenu>
          { modes.map(this.renderMode) }
        </EuiKeyPadMenu>
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
