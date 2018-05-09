import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIconTip,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { InspectorModes } from './inspector_modes2';

import './inspector.less';

class InspectorPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isHelpPopoverOpen: false,
      selectedView: props.views[0],
    };
  }

  componentWillReceiveProps(props) {
    if (props.views !== this.props.views && !props.views.includes(this.state.selectedView)) {
      this.setState({
        selectedView: props.views[0],
      });
    }
  }

  onModeSelected = (view) => {
    if (view !== this.state.selectedView) {
      this.setState({
        selectedView: view
      });
    }
  };

  renderSelectedPanel() {
    if (!this.state.selectedView) {
      return null;
    }

    return (
      <this.state.selectedView.component
        adapters={this.props.adapters}
        title={this.props.title}
      />
    );
  }

  renderHelpButton() {
    const helpText = (
      <EuiText
        color="ghost"
        className="inspector-panel__helpPopover"
      >
        <p>
          Using the Inspector you can gain insights into your visualization.
        </p>
        { this.state.selectedView.help &&
          <p>{ this.state.selectedView.help }</p>
        }
      </EuiText>
    );
    return (
      <EuiIconTip
        type="questionInCircle"
        color="text"
        aria-label="Help"
        content={helpText}
      />
    );
  }

  render() {
    const { views, onClose, title } = this.props;
    const { selectedView } = this.state;

    return (
      <EuiFlyout
        onClose={onClose}
      >
        <EuiFlyoutHeader>
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
          >
            <EuiFlexItem grow={true}>
              <EuiTitle size="s">
                <h1>{ title }</h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              className="inspector-panel__action"
            >
              { /* TODO: rename to views */ }
              <InspectorModes
                modes={views}
                onModeSelected={this.onModeSelected}
                selectedMode={selectedView}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        { this.renderSelectedPanel() }
        <EuiFlyoutFooter>
          <EuiButtonEmpty
            iconType="cross"
            onClick={this.props.onClose}
          >
            Close
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}

InspectorPanel.defaultProps = {
  title: 'Inspector',
};

InspectorPanel.propTypes = {
  adapters: PropTypes.object.isRequired,
  views: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
};

export { InspectorPanel };
