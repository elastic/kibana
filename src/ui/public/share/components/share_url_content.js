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

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  parse as parseUrl,
  format as formatUrl,
} from 'url';

import { unhashUrl } from '../../state_management/state_hashing';

export class ShareUrlContent extends Component {

  state = {};

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.resetShortUrls);

    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this.resetShortUrls();

    window.addEventListener('hashchange', this.resetShortUrls, false);
  }

  resetShortUrls = () => {
    if (this._isMounted) {
      this.setState({
        shortSnanshotUrl: undefined,
        shortOriginalUrl: undefined,
      });
    }
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
      <div>
        <p>{this.getOriginalUrl()}</p>
        <p>{this.getSnapshotUrl()}</p>
      </div>
    );
  }
}

ShareUrlContent.propTypes = {
  objectId: PropTypes.string,
  getUnhashableStates: PropTypes.func.isRequired,
};
