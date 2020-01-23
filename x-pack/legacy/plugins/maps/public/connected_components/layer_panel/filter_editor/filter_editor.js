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
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { indexPatternService } from '../../../kibana_services';
import { GlobalFilterCheckbox } from '../../../components/global_filter_checkbox';

import { npStart } from 'ui/new_platform';
const { SearchBar } = npStart.plugins.data.ui;

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
    // Filter only effects source so only load source indices.
    const indexPatternIds = this.props.layer.getSource().getIndexPatternIds();
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

  _onFilterByMapBoundsChange = event => {
    this.props.updateSourceProp(
      this.props.layer.getId(),
      'filterByMapBounds',
      event.target.checked
    );
  };

  _onApplyGlobalQueryChange = applyGlobalQuery => {
    this.props.updateSourceProp(this.props.layer.getId(), 'applyGlobalQuery', applyGlobalQuery);
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
        ownFocus
      >
        <div className="mapFilterEditor" data-test-subj="mapFilterEditor">
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
            indexPatterns={this.state.indexPatterns}
            customSubmitButton={
              <EuiButton fill data-test-subj="mapFilterEditorSubmitButton">
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
    let filterByBoundsSwitch;
    if (this.props.layer.getSource().isFilterByMapBoundsConfigurable()) {
      filterByBoundsSwitch = (
        <EuiFormRow display="rowCompressed">
          <EuiSwitch
            label={i18n.translate('xpack.maps.filterEditor.extentFilterLabel', {
              defaultMessage: 'Dynamically filter for data in the visible map area',
            })}
            checked={this.props.layer.getSource().isFilterByMapBounds()}
            onChange={this._onFilterByMapBoundsChange}
            compressed
          />
        </EuiFormRow>
      );
    }

    return (
      <Fragment>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.layerPanel.filterEditor.title"
              defaultMessage="Filtering"
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        {this._renderQuery()}

        <EuiTextAlign textAlign="center">{this._renderQueryPopover()}</EuiTextAlign>

        <EuiSpacer size="m" />

        {filterByBoundsSwitch}

        <GlobalFilterCheckbox
          label={i18n.translate('xpack.maps.filterEditor.applyGlobalQueryCheckboxLabel', {
            defaultMessage: `Apply global filter to layer data`,
          })}
          applyGlobalQuery={this.props.layer.getSource().getApplyGlobalQuery()}
          setApplyGlobalQuery={this._onApplyGlobalQueryChange}
        />
      </Fragment>
    );
  }
}
