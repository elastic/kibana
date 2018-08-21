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

// TODO: Remove once typescript definitions are in EUI
declare module '@elastic/eui' {
  export const EuiCopy: React.SFC<any>;
  export const EuiForm: React.SFC<any>;
}
const FixedEuiIconTip = EuiIconTip as React.SFC<any>;

import React, { Component } from 'react';
import './share_url_content.less';

import {
  EuiButton,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiRadioGroup,
  EuiSwitch,
} from '@elastic/eui';

import { format as formatUrl, parse as parseUrl } from 'url';

import { unhashUrl } from '../../state_management/state_hashing';
import { shortenUrl } from '../lib/url_shortener';

const EXPORT_URL_AS_SAVED_OBJECT = 'savedObject';
const EXPORT_URL_AS_SNAPSHOT = 'snapshot';

interface Props {
  isEmbedded?: boolean;
  objectId?: string;
  objectType: string;
  getUnhashableStates: () => any[];
}

interface State {
  exportUrlAs: string;
  useShortUrl: boolean;
  isCreatingShortUrl: boolean;
  url?: string;
  shortUrl?: string;
  shortUrlErrorMsg?: string;
}

export class ShareUrlContent extends Component<Props, State> {
  private mounted?: boolean;

  constructor(props: Props) {
    super(props);

    const defaultExportUrlAs = EXPORT_URL_AS_SNAPSHOT;
    const defaultUseShortUrl = false;

    this.state = {
      exportUrlAs: defaultExportUrlAs,
      useShortUrl: defaultUseShortUrl,
      isCreatingShortUrl: false,
      url: this.getUrl(defaultExportUrlAs, defaultUseShortUrl),
    };
  }

  public componentWillUnmount() {
    window.removeEventListener('hashchange', this.resetUrl);

    this.mounted = false;
  }

  public componentDidMount() {
    this.mounted = true;

    window.addEventListener('hashchange', this.resetUrl, false);
  }

  public render() {
    return (
      <EuiForm className="shareUrlContentForm" data-test-subj="shareUrlForm">
        {this.renderExportAsRadioGroup()}

        {this.renderShortUrlSwitch()}

        <EuiCopy textToCopy={this.state.url}>
          {(copy: () => void) => (
            <EuiButton
              fill
              onClick={copy}
              disabled={this.state.isCreatingShortUrl}
              data-share-url={this.state.url}
              data-test-subj="copyShareUrlButton"
            >
              Copy {this.props.isEmbedded ? 'iFrame code' : 'link'}
            </EuiButton>
          )}
        </EuiCopy>
      </EuiForm>
    );
  }

  private isNotSaved = () => {
    return this.props.objectId === undefined || this.props.objectId === '';
  };

  private resetUrl = () => {
    if (this.mounted) {
      this.setState(
        {
          useShortUrl: false,
          shortUrl: undefined,
          url: undefined,
        },
        this.setUrl
      );
    }
  };

  private createShortUrl = async () => {
    this.setState({
      isCreatingShortUrl: true,
      shortUrlErrorMsg: undefined,
    });

    let shortUrl;
    try {
      shortUrl = await shortenUrl(this.getSnapshotUrl());
    } catch (fetchError) {
      if (this.mounted) {
        this.setState({
          isCreatingShortUrl: false,
          shortUrlErrorMsg: `Unable to create short URL. Error: ${fetchError.message}`,
        });
      }
      throw fetchError;
    }

    if (!this.mounted) {
      return;
    }

    this.setState({
      shortUrl,
      isCreatingShortUrl: false,
    });
  };

  private getSavedObjectUrl = () => {
    if (this.isNotSaved()) {
      return;
    }

    const url = window.location.href;
    // Replace hashes with original RISON values.
    const unhashedUrl = unhashUrl(url, this.props.getUnhashableStates());

    const parsedUrl = parseUrl(unhashedUrl);
    if (!parsedUrl || !parsedUrl.hash) {
      return;
    }

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
  };

  private getSnapshotUrl = () => {
    const url = window.location.href;
    // Replace hashes with original RISON values.
    return unhashUrl(url, this.props.getUnhashableStates());
  };

  private makeUrlEmbeddable = (url: string) => {
    const embedQueryParam = '?embed=true';
    const urlHasQueryString = url.indexOf('?') !== -1;
    if (urlHasQueryString) {
      return url.replace('?', `${embedQueryParam}&`);
    }
    return `${url}${embedQueryParam}`;
  };

  private makeIframeTag = (url?: string) => {
    if (!url) {
      return;
    }

    const embeddableUrl = this.makeUrlEmbeddable(url);
    return `<iframe src="${embeddableUrl}" height="600" width="800"></iframe>`;
  };

  private getUrl = (exportUrlAs: string, useShortUrl: boolean) => {
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
  };

  private setUrl = () => {
    this.setState({
      url: this.getUrl(this.state.exportUrlAs, this.state.useShortUrl),
    });
  };

  private handleExportUrlAs = (optionId: string) => {
    this.setState(
      {
        exportUrlAs: optionId,
      },
      this.setUrl
    );
  };

  private handleShortUrlChange = async (evt: any) => {
    const isChecked = evt.target.checked;
    if (this.state.shortUrl === undefined && isChecked) {
      try {
        await this.createShortUrl();
      } catch (fetchError) {
        this.setState(
          {
            useShortUrl: false,
          },
          this.setUrl
        );
        return;
      }
    }

    this.setState(
      {
        useShortUrl: isChecked,
      },
      this.setUrl
    );
  };

  private renderExportUrlAsOptions = () => {
    return [
      {
        id: EXPORT_URL_AS_SNAPSHOT,
        label: this.renderWithIconTip(
          'Snapshot',
          `Snapshot URLs encode the current state of the ${this.props.objectType} in the URL itself.
            Edits to the saved ${this.props.objectType} won't be visible via this URL.`
        ),
      },
      {
        id: EXPORT_URL_AS_SAVED_OBJECT,
        disabled: this.isNotSaved(),
        label: this.renderWithIconTip(
          'Saved object',
          `You can share this URL with people to let them load the most recent saved version of this ${
            this.props.objectType
          }.`
        ),
      },
    ];
  };

  private renderWithIconTip = (child: React.ReactNode, tipContent: React.ReactNode) => {
    return (
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>{child}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FixedEuiIconTip content={tipContent} position="bottom" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  private renderExportAsRadioGroup = () => {
    const generateLinkAsHelp = this.isNotSaved()
      ? `Can't share as saved object until the ${this.props.objectType} has been saved.`
      : undefined;
    return (
      <EuiFormRow label="Generate the link as" helpText={generateLinkAsHelp}>
        <EuiRadioGroup
          options={this.renderExportUrlAsOptions()}
          idSelected={this.state.exportUrlAs}
          onChange={this.handleExportUrlAs}
        />
      </EuiFormRow>
    );
  };

  private renderShortUrlSwitch = () => {
    if (this.state.exportUrlAs === EXPORT_URL_AS_SAVED_OBJECT) {
      return;
    }

    const switchLabel = this.state.isCreatingShortUrl ? (
      <span>
        <EuiLoadingSpinner size="s" /> Short URL
      </span>
    ) : (
      'Short URL'
    );
    const switchComponent = (
      <EuiSwitch
        label={switchLabel}
        checked={this.state.useShortUrl}
        onChange={this.handleShortUrlChange}
        data-test-subj="useShortUrl"
      />
    );
    const tipContent = `We recommend sharing shortened snapshot URLs for maximum compatibility.
      Internet Explorer has URL length restrictions,
      and some wiki and markup parsers don't do well with the full-length version of the snapshot URL,
      but the short URL should work great.`;

    return (
      <EuiFormRow helpText={this.state.shortUrlErrorMsg}>
        {this.renderWithIconTip(switchComponent, tipContent)}
      </EuiFormRow>
    );
  };
}
