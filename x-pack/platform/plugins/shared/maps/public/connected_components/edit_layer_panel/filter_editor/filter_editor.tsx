/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { DataView, Query } from '@kbn/data-plugin/common';
import { APP_ID } from '../../../../common/constants';
import { getData, getSearchBar } from '../../../kibana_services';
import { GlobalFilterCheckbox } from '../../../components/global_filter_checkbox';
import { GlobalTimeCheckbox } from '../../../components/global_time_checkbox';
import { ILayer } from '../../../classes/layers/layer';
import { hasESSourceMethod } from '../../../classes/sources/es_source';
import { ForceRefreshCheckbox } from '../../../components/force_refresh_checkbox';

export interface Props {
  layer: ILayer;
  setLayerQuery: (id: string, query: Query) => void;
  updateSourceProp: (layerId: string, propName: string, value: unknown) => void;
  isFeatureEditorOpenForLayer: boolean;
}

interface State {
  isPopoverOpen: boolean;
  dataView?: DataView;
  isSourceTimeAware: boolean;
}

export class FilterEditor extends Component<Props, State> {
  private _isMounted = false;
  state: State = {
    isPopoverOpen: false,
    isSourceTimeAware: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadDataView();
    this._loadSourceTimeAware();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadDataView() {
    const source = this.props.layer.getSource();
    if (!hasESSourceMethod(source, 'getIndexPattern')) {
      return;
    }

    const dataView = await source.getIndexPattern();

    if (!this._isMounted) {
      return;
    }

    this.setState({ dataView });
  }

  async _loadSourceTimeAware() {
    const isSourceTimeAware = await this.props.layer.getSource().isTimeAware();
    if (this._isMounted) {
      this.setState({ isSourceTimeAware });
    }
  }

  _toggle = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _close = () => {
    this.setState({ isPopoverOpen: false });
  };

  _onQueryChange = ({ query }: { query?: Query }) => {
    if (!query) {
      return;
    }
    this.props.setLayerQuery(this.props.layer.getId(), query);
    this._close();
  };

  _onApplyGlobalQueryChange = (applyGlobalQuery: boolean) => {
    this.props.updateSourceProp(this.props.layer.getId(), 'applyGlobalQuery', applyGlobalQuery);
  };

  _onApplyGlobalTimeChange = (applyGlobalTime: boolean) => {
    this.props.updateSourceProp(this.props.layer.getId(), 'applyGlobalTime', applyGlobalTime);
  };

  _onRespondToForceRefreshChange = (applyForceRefresh: boolean) => {
    this.props.updateSourceProp(this.props.layer.getId(), 'applyForceRefresh', applyForceRefresh);
  };

  _renderQueryPopover() {
    const layerQuery = this.props.layer.getQuery();
    const SearchBar = getSearchBar();

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
            appName={APP_ID}
            showFilterBar={false}
            showDatePicker={false}
            showQueryInput={true}
            query={layerQuery ? layerQuery : getData().query.queryString.getDefaultQuery()}
            onQuerySubmit={this._onQueryChange}
            indexPatterns={this.state.dataView ? [this.state.dataView] : []}
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
    if (this.props.isFeatureEditorOpenForLayer) {
      return (
        <FormattedMessage
          id="xpack.maps.layerPanel.filterEditor.isLayerFilterNotApplied"
          defaultMessage="Layer filter is not applied while editing features"
        />
      );
    }

    const query = this.props.layer.getQuery();
    if (!query || !query.query) {
      return (
        <EuiText size="s">
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
        <EuiCodeBlock paddingSize="s">{query.query as string}</EuiCodeBlock>
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
            defaultMessage: 'Set filter',
          });
    const openButtonIcon = query && query.query ? 'pencil' : 'plusInCircleFilled';

    return (
      <EuiButtonEmpty
        size="xs"
        onClick={this._toggle}
        data-test-subj="mapLayerPanelOpenFilterEditorButton"
        iconType={openButtonIcon}
        disabled={this.props.isFeatureEditorOpenForLayer}
      >
        {openButtonLabel}
      </EuiButtonEmpty>
    );
  }

  render() {
    const globalTimeCheckbox = this.state.isSourceTimeAware ? (
      <GlobalTimeCheckbox
        label={i18n.translate('xpack.maps.filterEditor.applyGlobalTimeCheckboxLabel', {
          defaultMessage: `Apply global time to layer data`,
        })}
        applyGlobalTime={this.props.layer.getSource().getApplyGlobalTime()}
        setApplyGlobalTime={this._onApplyGlobalTimeChange}
        isFeatureEditorOpenForLayer={this.props.isFeatureEditorOpenForLayer}
      />
    ) : null;

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

        <EuiFlexGroup direction={'row'} wrap={false} component={'span'}>
          <EuiFlexItem grow={1}>{this._renderQueryPopover()}</EuiFlexItem>
          <EuiFlexItem grow={6}>{this._renderQuery()}</EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiHorizontalRule size="full" margin="s" />

        <GlobalFilterCheckbox
          label={i18n.translate('xpack.maps.filterEditor.applyGlobalQueryCheckboxLabel', {
            defaultMessage: `Apply global search to layer data`,
          })}
          applyGlobalQuery={this.props.layer.getSource().getApplyGlobalQuery()}
          setApplyGlobalQuery={this._onApplyGlobalQueryChange}
          isFeatureEditorOpenForLayer={this.props.isFeatureEditorOpenForLayer}
        />

        {globalTimeCheckbox}
        <ForceRefreshCheckbox
          applyForceRefresh={this.props.layer.getSource().getApplyForceRefresh()}
          setApplyForceRefresh={this._onRespondToForceRefreshChange}
        />
      </Fragment>
    );
  }
}
