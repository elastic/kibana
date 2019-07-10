/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiPopover,
  EuiExpression,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { data } from 'plugins/data/setup';
const { SearchBar } = data.search.ui;
import { Storage } from 'ui/storage';

const settings = chrome.getUiSettingsClient();
const localStorage = new Storage(window.localStorage);
const { savedQueryService } = data.search.services;
export class WhereExpression extends Component {

  state = {
    isPopoverOpen: false,
    savedQuery: null,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  }

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  }

  _onQueryChange = ({ query }) => {
    this.props.onChange(query);
    this._closePopover();
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
    this.props.onChange(newSavedQuery.attributes.query);
    this._closePopover();
  }

  _onSavedQueryChange = (changedSavedQuery) => {
    this._addOrUpdateSavedQuery(changedSavedQuery, this.state.savedQuery);
  }

  _addOrUpdateSavedQuery = async (currentSavedQuery, oldSavedQuery) => {
    if (!currentSavedQuery) return;
    await this._getSavedQueryFromService(currentSavedQuery);
    await this.setState({ savedQuery: currentSavedQuery });
    if (currentSavedQuery.id === (oldSavedQuery && oldSavedQuery.id)) {
      this.props.onChange(currentSavedQuery.attributes.query);
      this._closePopover();
    }
  }

  render() {
    const { whereQuery, indexPattern } = this.props;
    const expressionValue = whereQuery && whereQuery.query
      ? whereQuery.query
      : i18n.translate('xpack.maps.layerPanel.whereExpression.expressionValuePlaceholder', {
        defaultMessage: '-- add filter --'
      });

    return (
      <EuiPopover
        id="whereClausePopover"
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
        withTitle
        anchorPosition="leftCenter"
        button={
          <EuiExpression
            onClick={this._togglePopover}
            description={i18n.translate('xpack.maps.layerPanel.whereExpression.expressionDescription', {
              defaultMessage: 'where'
            })}
            uppercase={false}
            value={expressionValue}
            data-test-subj="mapJoinWhereExpressionButton"
          />
        }
      >
        <div className="mapFilterEditor" data-test-subj="mapJoinWhereFilterEditor">
          <SearchBar
            query={whereQuery ? whereQuery : { language: settings.get('search:queryLanguage'), query: '' }}
            onQuerySubmit={this._onQueryChange}
            appName="maps"
            screenTitle="maps"
            showDatePicker={false}
            showFilterBar={false}
            showQueryBar={true}
            filters={[]}
            onFiltersUpdated={this._onFiltersUpdated}
            indexPatterns={[indexPattern]}
            store={localStorage}
            savedQuery={this.state.savedQuery}
            onSaved={this._onQuerySaved}
            onSavedQueryUpdated={this._onSavedQueryChange}
            customSubmitButton={
              <EuiButton
                fill
                data-test-subj="mapWhereFilterEditorSubmitButton"
              >
                <FormattedMessage
                  id="xpack.maps.layerPanel.whereExpression.queryBarSubmitButtonLabel"
                  defaultMessage="Set filter"
                />
              </EuiButton>
            }
          />
        </div>
      </EuiPopover>
    );
  }
}
