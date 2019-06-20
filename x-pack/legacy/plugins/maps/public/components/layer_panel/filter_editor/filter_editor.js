/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import React, { Component, Fragment } from 'react';

import {
  EuiButton,
  EuiCodeBlock,
  EuiTitle,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { indexPatternService } from '../../../kibana_services';
import { Storage } from 'ui/storage';

import { data } from 'plugins/data/setup';
const { QueryBar } = data.query.ui;

const settings = chrome.getUiSettingsClient();
const localStorage = new Storage(window.localStorage);

export class FilterEditor extends Component {

  state = {
    isPopoverOpen: false,
    indexPatterns: [],
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadIndexPatterns();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _loadIndexPatterns = async () => {
    const indexPatternIds = this.props.layer.getIndexPatternIds();
    const indexPatterns = [];
    const getIndexPatternPromises = indexPatternIds.map(async (indexPatternId) => {
      try {
        const indexPattern = await indexPatternService.get(indexPatternId);
        indexPatterns.push(indexPattern);
      } catch(err) {
        // unable to fetch index pattern
      }
    });

    await Promise.all(getIndexPatternPromises);

    if (!this._isMounted) {
      return;
    }

    this.setState({ indexPatterns });
  }

  _toggle = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  }

  _close = () => {
    this.setState({ isPopoverOpen: false });
  }

  _onQueryChange = ({ query }) => {
    this.props.setLayerQuery(this.props.layer.getId(), query);
    this._close();
  }

  _renderQueryPopover() {
    const layerQuery = this.props.layer.getQuery();

    return (
      <EuiPopover
        id="layerQueryPopover"
        button={this._renderOpenButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._close}
        anchorPosition="leftCenter"
      >
        <div className="mapFilterEditor" data-test-subj="mapFilterEditor">
          <QueryBar
            query={layerQuery ? layerQuery : { language: settings.get('search:queryLanguage'), query: '' }}
            onSubmit={this._onQueryChange}
            appName="maps"
            showDatePicker={false}
            indexPatterns={this.state.indexPatterns}
            store={localStorage}
            customSubmitButton={
              <EuiButton
                fill
                data-test-subj="mapFilterEditorSubmitButton"
              >
                <FormattedMessage
                  id="xpack.maps.layerPanel.filterEditor.queryBarSubmitButtonLabel"
                  defaultMessage="Set filter"
                />
              </EuiButton>
            }
          />
        </div>
      </EuiPopover>
    );
  }

  _renderQuery() {
    const query = this.props.layer.getQuery();
    if (!query || !query.query) {
      return (
        <EuiText>
          <p>
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="xpack.maps.layerPanel.filterEditor.emptyState.description"
                defaultMessage="Add a filter to narrow the layer data."
              />
            </EuiTextColor>
          </p>
        </EuiText>

      );
    }

    return (
      <Fragment>
        <EuiCodeBlock paddingSize="s">
          {query.query}
        </EuiCodeBlock>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  _renderOpenButton() {
    const query = this.props.layer.getQuery();
    const openButtonLabel = query && query.query
      ? i18n.translate('xpack.maps.layerPanel.filterEditor.editFilterButtonLabel', {
        defaultMessage: 'Edit filter'
      })
      : i18n.translate('xpack.maps.layerPanel.filterEditor.addFilterButtonLabel', {
        defaultMessage: 'Add filter'
      });

    return (
      <EuiButton
        onClick={this._toggle}
        data-test-subj="mapLayerPanelOpenFilterEditorButton"
        iconType="arrowDown"
        iconSide="right"
      >
        {openButtonLabel}
      </EuiButton>
    );
  }

  render() {
    return (
      <Fragment>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.layerPanel.filterEditor.title"
              defaultMessage="Filter"
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m"/>

        {this._renderQuery()}

        {this._renderQueryPopover()}

      </Fragment>
    );
  }
}
