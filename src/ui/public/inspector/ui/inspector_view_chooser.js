import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
} from '@elastic/eui';

class InspectorViewChooser extends Component {

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

  renderView = (view, index) => {
    return (
      <EuiContextMenuItem
        key={index}
        onClick={() => {
          this.props.onViewSelected(view);
          this.closeSelector();
        }}
        toolTipContent={view.help}
        toolTipPosition="left"
        data-test-subj={`inspectorViewChooser${view.title}`}
      >
        {view.title}
      </EuiContextMenuItem>
    );
  }

  renderCurrentView() {
    return (
      <EuiButtonEmpty
        size="l"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.toggleSelector}
        data-test-subj="inspectorViewChooser"
      >
        <EuiIcon
          type="apps"
          size="m"
          aria-hidden="true"
          className="inspector-view-chooser__icon"
        />
        { this.props.selectedView.title }
      </EuiButtonEmpty>
    );
  }

  render() {
    const { views } = this.props;
    const triggerButton = this.renderCurrentView();

    return (
      <EuiPopover
        id="inspectorViewChooser"
        ownFocus
        button={triggerButton}
        isOpen={this.state.isSelectorOpen}
        closePopover={this.closeSelector}
        panelPaddingSize="none"
        anchorPosition="downRight"
      >
        <EuiContextMenuPanel
          items={views.map(this.renderView)}
        />
      </EuiPopover>
    );
  }
}

InspectorViewChooser.propTypes = {
  views: PropTypes.array.isRequired,
  onViewSelected: PropTypes.func.isRequired,
  selectedView: PropTypes.object.isRequired,
};

export { InspectorViewChooser };
