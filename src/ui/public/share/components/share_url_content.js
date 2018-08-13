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

const EXPORT_URL_AS_SAVED_OBJECT = 'savedObject';
const EXPORT_URL_AS_SNAPSHOT = 'snapshot';

export class ShareUrlContent extends Component {

  state = {
    exportUrlAs: EXPORT_URL_AS_SNAPSHOT,
    useShortUrl: false,
    isCreatingShortUrl: false,
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
      this.setState({ shortUrl: undefined });
    }
  }

  createShortUrl = async () => {
    this.setState({ isCreatingShortUrl: true });

    // TODO create short URL
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
      exportUrlAs: optionId,
    });
  };

  renderRadioOptions = () => {
    return [
      {
        id: EXPORT_URL_AS_SAVED_OBJECT,
        disabled: this.isNotSaved(),
        label: this.renderWithIconTip(
          'Saved object',
          `You can share this URL with people to let them load the most recent saved version of this ${this.props.objectType}.`
        ),
      },
      {
        id: EXPORT_URL_AS_SNAPSHOT,
        label: this.renderWithIconTip(
          'Snapshot',
          `Snapshot URLs encode the current state of the ${this.props.objectType} in the URL itself.
            Edits to the saved ${this.props.objectType} won't be visible via this URL.`
        ),
      }
    ];
  }

  renderWithIconTip = (child, tipContent) => {
    return (
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          {child}
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

  renderExportAsRadioGroup = () => {
    const generateLinkAsHelp = this.isNotSaved()
      ? `Can't share as saved object until the ${this.props.objectType} has been saved.`
      : undefined;
    return (
      <EuiFormRow
        label="Generate the link as"
        helpText={generateLinkAsHelp}
      >
        <EuiRadioGroup
          options={this.renderRadioOptions()}
          idSelected={this.state.exportUrlAs}
          onChange={this.handleRadioChange}
        />
      </EuiFormRow>
    );
  }

  renderShortUrlSwitch = () => {
    if (this.state.exportUrlAs === EXPORT_URL_AS_SAVED_OBJECT) {
      return;
    }

    const switchComponent = (<EuiSwitch
      label="Short URL"
      checked={this.state.useShortUrl}
      onChange={this.handleShortUrlChange}
    />);
    const tipContent = `We recommend sharing shortened snapshot URLs for maximum compatibility.
      Internet Explorer has URL length restrictions,
      and some wiki and markup parsers don't do well with the full-length version of the snapshot URL,
      but the short URL should work great.`;
    return (
      <EuiFormRow>
        {this.renderWithIconTip(switchComponent, tipContent)}
      </EuiFormRow>
    );
  }

  handleShortUrlChange = evt => {
    if (this.state.shortUrl === undefined) {
      this.createShortUrl();
    }

    this.setState({
      useShortUrl: evt.target.checked,
    });
  }

  render() {
    return (
      <EuiForm className="shareUrlContentForm">

        {this.renderExportAsRadioGroup()}

        {this.renderShortUrlSwitch()}

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
