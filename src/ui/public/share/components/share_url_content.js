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
  EuiLoadingSpinner,
} from '@elastic/eui';

import {
  parse as parseUrl,
  format as formatUrl,
} from 'url';

import { unhashUrl } from '../../state_management/state_hashing';
import { shortenUrl } from '../lib/url_shortener';

const EXPORT_URL_AS_SAVED_OBJECT = 'savedObject';
const EXPORT_URL_AS_SNAPSHOT = 'snapshot';

export class ShareUrlContent extends Component {

  constructor(props) {
    super(props);

    this.state = {
      exportUrlAs: EXPORT_URL_AS_SNAPSHOT,
      useShortUrl: false,
      isCreatingShortUrl: false,
      url: this.getUrl(EXPORT_URL_AS_SNAPSHOT, false),
    };
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.resetUrl);

    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;

    window.addEventListener('hashchange', this.resetUrl, false);
  }

  isNotSaved = () => {
    return this.props.objectId === undefined || this.props.objectId === '';
  }

  resetUrl = () => {
    if (this._isMounted) {
      this.setState({
        useShortUrl: false,
        shortUrl: undefined,
        url: undefined,
      }, this.setUrl);
    }
  }

  getShortUrl = async () => {
    this.setState({ isCreatingShortUrl: true });

    const shortUrl = await shortenUrl(this.getSnapshotUrl());
    if (!this._isMounted) {
      return;
    }

    this.setState({
      shortUrl,
      isCreatingShortUrl: false,
    });
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

  makeUrlEmbeddable = url => {
    const embedQueryParam = '?embed=true';
    const urlHasQueryString = url.indexOf('?') !== -1;
    if (urlHasQueryString) {
      return url.replace('?', `${embedQueryParam}&`);
    }
    return `${url}${embedQueryParam}`;
  }

  makeIframeTag = url => {
    if (!url) return;

    const embeddableUrl = this.makeUrlEmbeddable(url);
    return `<iframe src="${embeddableUrl}" height="600" width="800"></iframe>`;
  }

  getUrl = (exportUrlAs, useShortUrl) => {
    let url;
    if (exportUrlAs === EXPORT_URL_AS_SAVED_OBJECT) {
      url = this.getSavedObjectUrl();
    } else if (useShortUrl) {
      url = this.state.shortUrl;
    } else {
      url = this.getSnapshotUrl();
    }

    if (this.props.isEmbedded) {
      return this.makeIframeTag(url);
    }

    return url;
  }

  setUrl = () => {
    this.setState({
      url: this.getUrl(this.state.exportUrlAs, this.state.useShortUrl)
    });
  }

  handleExportUrlAs = optionId => {
    this.setState({
      exportUrlAs: optionId,
    }, this.setUrl);
  }

  handleShortUrlChange = async evt => {
    const isChecked = evt.target.checked;
    if (this.state.shortUrl === undefined && isChecked) {
      await this.getShortUrl();
    }

    this.setState({
      useShortUrl: isChecked,
    }, this.setUrl);
  }

  renderExportUrlAsOptions = () => {
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
          options={this.renderExportUrlAsOptions()}
          idSelected={this.state.exportUrlAs}
          onChange={this.handleExportUrlAs}
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
    let loadingShortUrl;
    if (this.state.isCreatingShortUrl) {
      loadingShortUrl = (
        <EuiLoadingSpinner size="s"/>
      );
    }
    return (
      <EuiFormRow helpText={loadingShortUrl}>
        {this.renderWithIconTip(switchComponent, tipContent)}
      </EuiFormRow>
    );
  }

  render() {
    return (
      <EuiForm className="shareUrlContentForm">

        {this.renderExportAsRadioGroup()}

        {this.renderShortUrlSwitch()}

        <EuiButton
          fill
          onClick={() => window.alert(this.state.url)}
          disabled={this.state.isCreatingShortUrl}
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
