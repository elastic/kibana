import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
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

  renderViewButton() {
    return (
      <EuiButtonEmpty
        size="s"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.toggleSelector}
        data-test-subj="inspectorViewChooser"
      >
        View: { this.props.selectedView.title }
      </EuiButtonEmpty>
    );
  }

  renderSingleView() {
    return (
      <EuiToolTip
        position="bottom"
        content={this.props.selectedView.help}
      >
        <span>View: { this.props.selectedView.title }</span>
      </EuiToolTip>
    );
  }

  render() {
    const { views } = this.props;

    if (views.length < 2) {
      return this.renderSingleView();
    }

    const triggerButton = this.renderViewButton();

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
