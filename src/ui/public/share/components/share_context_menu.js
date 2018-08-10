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

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiContextMenu,
} from '@elastic/eui';

import { ShareUrlContent } from './share_url_content';

export class ShareContextMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {
      panels: [
        {
          id: 0,
          title: `Share this ${this.props.objectType}`,
          items: [{
            name: 'Embed code',
            icon: 'console',
            panel: 1
          }, {
            name: 'Permalinks',
            icon: 'link',
            panel: 2
          }],
        },
        {
          id: 1,
          title: 'Embed Code',
          content: (
            <ShareUrlContent
              isEmbedded
              objectId={this.props.objectId}
              objectType={this.props.objectType}
              getUnhashableStates={this.props.getUnhashableStates}
            />
          )
        },
        {
          id: 2,
          title: 'Permalink',
          content: (
            <ShareUrlContent
              objectId={this.props.objectId}
              objectType={this.props.objectType}
              getUnhashableStates={this.props.getUnhashableStates}
            />
          )
        }
      ]
    };
  }

  render() {
    return (
      <EuiContextMenu
        initialPanelId={0}
        panels={this.state.panels}
      />
    );
  }
}

ShareContextMenu.propTypes = {
  objectId: PropTypes.string,
  objectType: PropTypes.string.isRequired,
  getUnhashableStates: PropTypes.func.isRequired,
};
