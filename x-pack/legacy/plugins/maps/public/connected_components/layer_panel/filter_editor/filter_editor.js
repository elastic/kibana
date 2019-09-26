/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import {
  EuiButton,
  EuiCodeBlock,
  EuiTitle,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTextAlign,
  EuiButtonEmpty,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { indexPatternService } from '../../../kibana_services';
import { Storage } from 'ui/storage';

import { SearchBar } from 'plugins/data';

import { npStart } from 'ui/new_platform';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
const localStorage = new Storage(window.localStorage);

export class FilterEditor extends Component {
  state = {
    isPopoverOpen: false,
    indexPatterns: [],
  };

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
    const getIndexPatternPromises = indexPatternIds.map(async indexPatternId => {
      try {
        const indexPattern = await indexPatternService.get(indexPatternId);
        indexPatterns.push(indexPattern);
      } catch (err) {
        // unable to fetch index pattern
      }
    });

    await Promise.all(getIndexPatternPromises);

    if (!this._isMounted) {
      return;
    }

    this.setState({ indexPatterns });
  };

  _toggle = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _close = () => {
    this.setState({ isPopoverOpen: false });
  };

  _onQueryChange = ({ query }) => {
    this.props.setLayerQuery(this.props.layer.getId(), query);
    this._close();
  };

  _renderQueryPopover() {
    const layerQuery = this.props.layer.getQuery();
    const { uiSettings } = npStart.core;

    return (
      <EuiPopover
        id="layerQueryPopover"
        button={this._renderOpenButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._close}
        anchorPosition="leftCenter"
      >
        <div className="mapFilterEditor" data-test-subj="mapFilterEditor">
          <KibanaContextProvider
            services={{
              uiSettings: uiSettings,
              savedObjects: npStart.core.savedObjects,
            }}
          >
            <SearchBar
              showFilterBar={false}
              showDatePicker={false}
              showQueryInput={true}
              query={
                layerQuery
                  ? layerQuery
                  : { language: uiSettings.get('search:queryLanguage'), query: '' }
              }
              onQuerySubmit={this._onQueryChange}
              appName="maps"
              indexPatterns={this.state.indexPatterns}
              store={localStorage}
              customSubmitButton={
                <EuiButton fill data-test-subj="mapFilterEditorSubmitButton">
                  <FormattedMessage
                    id="xpack.maps.layerPanel.filterEditor.queryBarSubmitButtonLabel"
                    defaultMessage="Set filter"
                  />
                </EuiButton>
              }
            />
          </KibanaContextProvider>
        </div>
      </EuiPopover>
    );
  }

  _renderQuery() {
    const query = this.props.layer.getQuery();
    if (!query || !query.query) {
      return (
        <EuiText size="s" textAlign="center">
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
        <EuiCodeBlock paddingSize="s">{query.query}</EuiCodeBlock>

        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  _renderOpenButton() {
    const query = this.props.layer.getQuery();
    const openButtonLabel =
      query && query.query
        ? i18n.translate('xpack.maps.layerPanel.filterEditor.editFilterButtonLabel', {
          defaultMessage: 'Edit filter',
        })
        : i18n.translate('xpack.maps.layerPanel.filterEditor.addFilterButtonLabel', {
          defaultMessage: 'Add filter',
        });
    const openButtonIcon = query && query.query ? 'pencil' : 'plusInCircleFilled';

    return (
      <EuiButtonEmpty
        size="xs"
        onClick={this._toggle}
        data-test-subj="mapLayerPanelOpenFilterEditorButton"
        iconType={openButtonIcon}
      >
        {openButtonLabel}
      </EuiButtonEmpty>
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

        <EuiSpacer size="m" />

        {this._renderQuery()}

        <EuiTextAlign textAlign="center">{this._renderQueryPopover()}</EuiTextAlign>
      </Fragment>
    );
  }
}
