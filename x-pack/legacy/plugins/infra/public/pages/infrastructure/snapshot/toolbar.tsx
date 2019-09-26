/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { AutocompleteField } from '../../../components/autocomplete_field';
import { Toolbar } from '../../../components/eui/toolbar';
import { WaffleGroupByControls } from '../../../components/waffle/waffle_group_by_controls';
import { WaffleMetricControls } from '../../../components/waffle/waffle_metric_controls';
import { WaffleNodeTypeSwitcher } from '../../../components/waffle/waffle_node_type_switcher';
import { WaffleTimeControls } from '../../../components/waffle/waffle_time_controls';
import { WithWaffleFilter } from '../../../containers/waffle/with_waffle_filters';
import { WithWaffleOptions } from '../../../containers/waffle/with_waffle_options';
import { WithWaffleTime } from '../../../containers/waffle/with_waffle_time';
import { WithKueryAutocompletion } from '../../../containers/with_kuery_autocompletion';
import { WithSource } from '../../../containers/with_source';
import { SavedViewsToolbarControls } from '../../../components/saved_views/toolbar_control';
import { WithWaffleViewState } from '../../../containers/waffle/with_waffle_view_state';

export const SnapshotToolbar = () => (
  <Toolbar>
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
      <EuiFlexItem>
        <WithSource>
          {({ createDerivedIndexPattern }) => (
            <WithKueryAutocompletion indexPattern={createDerivedIndexPattern('metrics')}>
              {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
                <WithWaffleFilter indexPattern={createDerivedIndexPattern('metrics')}>
                  {({
                    applyFilterQueryFromKueryExpression,
                    filterQueryDraft,
                    isFilterQueryDraftValid,
                    setFilterQueryDraftFromKueryExpression,
                  }) => (
                    <AutocompleteField
                      isLoadingSuggestions={isLoadingSuggestions}
                      isValid={isFilterQueryDraftValid}
                      loadSuggestions={loadSuggestions}
                      onChange={setFilterQueryDraftFromKueryExpression}
                      onSubmit={applyFilterQueryFromKueryExpression}
                      placeholder={i18n.translate(
                        'xpack.infra.homePage.toolbar.kqlSearchFieldPlaceholder',
                        {
                          defaultMessage: 'Search for infrastructure data… (e.g. host.name:host-1)',
                        }
                      )}
                      suggestions={suggestions}
                      value={filterQueryDraft ? filterQueryDraft.expression : ''}
                      autoFocus={true}
                    />
                  )}
                </WithWaffleFilter>
              )}
            </WithKueryAutocompletion>
          )}
        </WithSource>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <WithWaffleTime resetOnUnmount>
          {({ currentTime, isAutoReloading, jumpToTime, startAutoReload, stopAutoReload }) => (
            <WaffleTimeControls
              currentTime={currentTime}
              isLiveStreaming={isAutoReloading}
              onChangeTime={jumpToTime}
              startLiveStreaming={startAutoReload}
              stopLiveStreaming={stopAutoReload}
            />
          )}
        </WithWaffleTime>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <WithSource>
        {({ createDerivedIndexPattern }) => (
          <WithWaffleOptions>
            {({
              changeMetric,
              changeNodeType,
              changeGroupBy,
              changeCustomOptions,
              customOptions,
              groupBy,
              metric,
              nodeType,
            }) => (
              <React.Fragment>
                <EuiFlexItem grow={false}>
                  <WaffleNodeTypeSwitcher
                    nodeType={nodeType}
                    changeNodeType={changeNodeType}
                    changeMetric={changeMetric}
                    changeGroupBy={changeGroupBy}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <WaffleMetricControls
                    metric={metric}
                    nodeType={nodeType}
                    onChange={changeMetric}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <WaffleGroupByControls
                    groupBy={groupBy}
                    nodeType={nodeType}
                    onChange={changeGroupBy}
                    fields={createDerivedIndexPattern('metrics').fields}
                    onChangeCustomOptions={changeCustomOptions}
                    customOptions={customOptions}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <WithWaffleViewState indexPattern={createDerivedIndexPattern('metrics')}>
                    {({ defaultViewState, viewState, onViewChange }) => (
                      <SavedViewsToolbarControls
                        defaultViewState={defaultViewState}
                        viewState={viewState}
                        onViewChange={onViewChange}
                        viewType={'INVENTORY_VIEW'}
                      />
                    )}
                  </WithWaffleViewState>
                </EuiFlexItem>
              </React.Fragment>
            )}
          </WithWaffleOptions>
        )}
      </WithSource>
    </EuiFlexGroup>
  </Toolbar>
);
