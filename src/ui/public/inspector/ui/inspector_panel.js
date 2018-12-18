/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';

import { InspectorViewChooser } from './inspector_view_chooser';

function hasAdaptersChanged(oldAdapters, newAdapters) {
  return Object.keys(oldAdapters).length !== Object.keys(newAdapters).length
    || Object.keys(oldAdapters).some(key => oldAdapters[key] !== newAdapters[key]);
}

const inspectorTitle = i18n.translate('common.ui.inspector.title', {
  defaultMessage: 'Inspector',
});

class InspectorPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedView: props.views[0],
      views: props.views,
      // Clone adapters array so we can validate that this prop never change
      adapters: { ...props.adapters },
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (hasAdaptersChanged(prevState.adapters, nextProps.adapters)) {
      throw new Error('Adapters are not allowed to be changed on an open InspectorPanel.');
    }
    const selectedViewMustChange = nextProps.views !== prevState.views
        && !nextProps.views.includes(prevState.selectedView);
    return {
      views: nextProps.views,
      selectedView: selectedViewMustChange ? nextProps.views[0] : prevState.selectedView,
    };
  }

  onViewSelected = (view) => {
    if (view !== this.state.selectedView) {
      this.setState({
        selectedView: view
      });
    }
  };

  renderSelectedPanel() {
    return (
      <this.state.selectedView.component
        adapters={this.props.adapters}
        title={this.props.title}
      />
    );
  }

  render() {
    const { views, title } = this.props;
    const { selectedView } = this.state;

    return (
      <React.Fragment>
        <EuiFlyoutHeader hasBorder>
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
      </React.Fragment>
    );
  }
}

InspectorPanel.defaultProps = {
  title: inspectorTitle,
};

InspectorPanel.propTypes = {
  adapters: PropTypes.object.isRequired,
  views: (props, propName, componentName) => {
    if (!Array.isArray(props[propName]) || props[propName].length < 1) {
      throw new Error(
        `${propName} prop must be an array of at least one element in ${componentName}.`
      );
    }
  },
  title: PropTypes.string,
};

export { InspectorPanel };
