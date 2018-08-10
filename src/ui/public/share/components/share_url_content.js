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

import './share_url_content.less';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiButton,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiRadioGroup,
} from '@elastic/eui';


import {
  parse as parseUrl,
  format as formatUrl,
} from 'url';

import { unhashUrl } from '../../state_management/state_hashing';

const RADIO_SAVED_OBJECT_ID = 'savedObject';
const RADIO_SNAPSHOT_ID = 'snapshot';

export class ShareUrlContent extends Component {

  state = {
    radioIdSelected: RADIO_SNAPSHOT_ID,
  }

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
      this.setState({ shortSnanshotUrl: undefined });
    }
  }

  isNotSaved = () => {
    return this.props.objectId === undefined || this.props.objectId === '';
  }

  getSavedObjectUrl = () => {
    if (this.isNotSaved()) {
      return;
    }

    const url = window.location.href;
    // Replace hashes with original RISON values.
    const unhashedUrl = unhashUrl(url, this.props.getUnhashableStates());

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
    const url = window.location.href;
    // Replace hashes with original RISON values.
    return unhashUrl(url, this.props.getUnhashableStates());
  }

  handleRadioChange = optionId => {
    this.setState({
      radioIdSelected: optionId,
    });
  };

  renderRadioOptions = () => {
    return [
      {
        id: RADIO_SAVED_OBJECT_ID,
        disabled: this.isNotSaved(),
        label: this.renderRadio(
          'Saved object',
          `You can share this URL with people to let them load the most recent saved version of this ${this.props.objectType}.`
        ),
      },
      {
        id: RADIO_SNAPSHOT_ID,
        label: this.renderRadio(
          'Snapshot',
          `Snapshot URLs encode the current state of the ${this.props.objectType} in the URL itself.
            Edits to the saved ${this.props.objectType} won't be visible via this URL.`
        ),
      }
    ];
  }

  renderRadio = (label, tipContent) => {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          {label}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={tipContent}
            position="bottom"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  render() {
    const generateLinkAsHelp = this.isNotSaved()
      ? `Can't share as saved object until the ${this.props.objectType} has been saved.`
      : undefined;

    return (
      <EuiForm className="shareUrlContentForm">

        <EuiFormRow
          label="Generate the link as"
          helpText={generateLinkAsHelp}
        >
          <EuiRadioGroup
            options={this.renderRadioOptions()}
            idSelected={this.state.radioIdSelected}
            onChange={this.handleRadioChange}
          />
        </EuiFormRow>

        <EuiButton
          fill
          onClick={() => window.alert('Button clicked')}
        >
          Copy { this.props.isEmbedded ? 'iFrame code' : 'link' }
        </EuiButton>

      </EuiForm>
    );
  }
}

ShareUrlContent.propTypes = {
  isEmbedded: PropTypes.bool,
  objectId: PropTypes.string,
  objectType: PropTypes.string.isRequired,
  getUnhashableStates: PropTypes.func.isRequired,
};
