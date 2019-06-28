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
const { SearchBar } = data.search.ui;
const { savedQueryService } = data.search.services;

const settings = chrome.getUiSettingsClient();
const localStorage = new Storage(window.localStorage);

export class FilterEditor extends Component {

  state = {
    isPopoverOpen: false,
    indexPatterns: [],
    savedQuery: null,
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadIndexPatterns();
  }

  // componentDidUpdate(prevProps, prevState) {
  //   const prevQuery = prevProps.layer.getQuery();
  //   const currentQuery = this.props.layer.getQuery();
  //   const prevSavedQuery = prevState.savedQuery;
  //   const currentSavedQuery = this.state.savedQuery;
  //   if (prevSavedQuery !== currentSavedQuery) {
  //     console.log(`the savedQuery prop has changed from ${prevSavedQuery} to ${currentSavedQuery}`);
  //   }
  //   if (prevQuery !== currentQuery) {
  //     console.log(`the query prop has changed from ${prevQuery} to ${currentQuery}`);
  //   }
  //   if (prevState.savedQuery !== this.state.savedQuery) {
  //     console.log(`the incomming savedQuery ${prevState.savedQuery} is different to the one on state ${this.state.savedQuery}`);
  //   }
  // }

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

  _open = () => {
    this.setState({ isPopoverOpen: true });
  }

  _onQueryChange = ({ query }) => {
    this.props.setLayerQuery(this.props.layer.getId(), query);
    this._close();
  }

  _onFiltersUpdated = () => {
    return;
  }

  _onQuerySaved = (savedQuery) => {
    this._addOrUpdateSavedQuery(savedQuery, this.state.savedQuery);
  }

  _getSavedQueryFromService = async (savedQuery) => {
    if (!savedQuery.id) return;
    const newSavedQuery = await savedQueryService.getSavedQuery(savedQuery.id);
    await this.setState({ savedQuery: newSavedQuery });
    this.props.setLayerQuery(this.props.layer.getId(), newSavedQuery.attributes.query);
  }

  _onSavedQueryChange = (changedSavedQuery) => {
    this._addOrUpdateSavedQuery(changedSavedQuery, this.state.savedQuery);
  }

  _addOrUpdateSavedQuery = (currentSavedQuery, oldSavedQuery) => {
    if (!currentSavedQuery) return;
    this._getSavedQueryFromService(currentSavedQuery);
    // this.setState({ currentSavedQuery: currentSavedQuery.id });
    this.setState({ savedQuery: currentSavedQuery });
    if (currentSavedQuery.id === (oldSavedQuery && oldSavedQuery.id)) {
      this.props.setLayerQuery(this.props.layer.getId(), currentSavedQuery.attributes.query);
    }
    this._renderOpenButton();
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
          <SearchBar
            query={layerQuery ? layerQuery : { language: settings.get('search:queryLanguage'), query: '' }}
            appName="maps"
            screenTitle="maps"
            onQuerySubmit={this._onQueryChange}
            indexPatterns={this.state.indexPatterns}
            showDatePicker={false}
            filters={[]}
            onFiltersUpdated={this._onFiltersUpdated}
            showFilterBar={false}
            showQueryBar={true}
            store={localStorage}
            savedQuery={this.state.savedQuery}
            onSaved={this._onQuerySaved}
            onSavedQueryUpdated={this._onSavedQueryChange}
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
