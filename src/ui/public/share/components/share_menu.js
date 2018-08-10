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

import {
  parse as parseUrl,
  format as formatUrl,
} from 'url';

import { unhashUrl } from '../../state_management/state_hashing';

import { ShareUrlContent } from './share_url_content';

export class ShareMenu extends Component {
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
              getOriginalUrl={this.getOriginalUrl}
              getSnapshotUrl={this.getSnapshotUrl}
            />
          )
        },
        {
          id: 2,
          title: 'Permalink',
          content: (
            <ShareUrlContent
              getOriginalUrl={this.getOriginalUrl}
              getSnapshotUrl={this.getSnapshotUrl}
            />
          )
        }
      ]
    };
  }

  getOriginalUrl = () => {
    const {
      objectId,
      getUnhashableStates,
    } = this.props;

    // If there is no objectId, then it isn't saved, so it has no original URL.
    if (objectId === undefined || objectId === '') {
      return;
    }

    const url = window.location.href;
    // Replace hashes with original RISON values.
    const unhashedUrl = unhashUrl(url, getUnhashableStates());

    const parsedUrl = parseUrl(unhashedUrl);
    // Get the application route, after the hash, and remove the #.
    const parsedAppUrl = parseUrl(parsedUrl.hash.slice(1), true);

    return formatUrl({
      protocol: parsedUrl.protocol,
      auth: parsedUrl.auth,
      host: parsedUrl.host,
      pathname: parsedUrl.pathname,
      hash: formatUrl({
        pathname: parsedAppUrl.pathname,
        query: {
          // Add global state to the URL so that the iframe doesn't just show the time range
          // default.
          _g: parsedAppUrl.query._g,
        },
      }),
    });
  }

  getSnapshotUrl = () => {
    const { getUnhashableStates } = this.props;

    const url = window.location.href;
    // Replace hashes with original RISON values.
    return unhashUrl(url, getUnhashableStates());
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

ShareMenu.propTypes = {
  objectId: PropTypes.string,
  objectType: PropTypes.string.isRequired,
  getUnhashableStates: PropTypes.func.isRequired,
};
