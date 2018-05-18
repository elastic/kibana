import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';

import { InspectorViewChooser } from './inspector_view_chooser';

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

  onViewSelected = (view) => {
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

  render() {
    const { views, onClose, title } = this.props;
    const { selectedView } = this.state;

    return (
      <EuiFlyout
        onClose={onClose}
        data-test-subj="inspectorPanel"
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
            <EuiFlexItem grow={false}>
              <InspectorViewChooser
                views={views}
                onViewSelected={this.onViewSelected}
                selectedView={selectedView}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        { this.renderSelectedPanel() }
        <EuiFlyoutFooter>
          <EuiButtonEmpty
            iconType="cross"
            onClick={this.props.onClose}
            data-test-subj="inspectorPanel-close"
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
