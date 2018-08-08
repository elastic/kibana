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

export class ShareMenu extends Component {

  state = {
  }

  panels = [
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
        <div>
          embed code content goes here
        </div>
      )
    },
    {
      id: 2,
      title: 'Permalink',
      content: (
        <div>
          Permalink content goes here
        </div>
      )
    }
  ];

  render() {
    return (
      <EuiContextMenu
        initialPanelId={0}
        panels={this.panels}
      />
    );
  }
}

ShareMenu.propTypes = {
  objectType: PropTypes.string.isRequired,
  getUnhashableStates: PropTypes.func.isRequired,
};
