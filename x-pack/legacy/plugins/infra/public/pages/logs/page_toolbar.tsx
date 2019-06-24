/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import React, { useContext } from 'react';

import { AutocompleteField } from '../../components/autocomplete_field';
import { Toolbar } from '../../components/eui';
import { LogCustomizationMenu } from '../../components/logging/log_customization_menu';
import { LogMinimapScaleControls } from '../../components/logging/log_minimap_scale_controls';
import { LogTextScaleControls } from '../../components/logging/log_text_scale_controls';
import { LogTextWrapControls } from '../../components/logging/log_text_wrap_controls';
import { LogTimeControls } from '../../components/logging/log_time_controls';
import { SourceConfigurationButton } from '../../components/source_configuration';
import { LogFlyout } from '../../containers/logs/log_flyout';
import { LogViewConfiguration } from '../../containers/logs/log_view_configuration';
import { WithLogFilter } from '../../containers/logs/with_log_filter';
import { WithLogPosition } from '../../containers/logs/with_log_position';
import { Source } from '../../containers/source';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';

export const LogsToolbar = injectI18n(({ intl }) => {
  const { derivedIndexPattern } = useContext(Source.Context);
  const {
    availableIntervalSizes,
    availableTextScales,
    intervalSize,
    setIntervalSize,
    setTextScale,
    setTextWrap,
    textScale,
    textWrap,
  } = useContext(LogViewConfiguration.Context);

  const { setSurroundingLogsId } = useContext(LogFlyout.Context);
  return (
    <Toolbar>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem>
          <WithKueryAutocompletion indexPattern={derivedIndexPattern}>
            {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
              <WithLogFilter indexPattern={derivedIndexPattern}>
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
                    onChange={(expression: string) => {
                      setSurroundingLogsId(null);
                      setFilterQueryDraftFromKueryExpression(expression);
                    }}
                    onSubmit={(expression: string) => {
                      setSurroundingLogsId(null);
                      applyFilterQueryFromKueryExpression(expression);
                    }}
                    placeholder={intl.formatMessage({
                      id: 'xpack.infra.logsPage.toolbar.kqlSearchFieldPlaceholder',
                      defaultMessage: 'Search for log entries… (e.g. host.name:host-1)',
                    })}
                    suggestions={suggestions}
                    value={filterQueryDraft ? filterQueryDraft.expression : ''}
                  />
                )}
              </WithLogFilter>
            )}
          </WithKueryAutocompletion>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SourceConfigurationButton />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LogCustomizationMenu>
            <LogMinimapScaleControls
              availableIntervalSizes={availableIntervalSizes}
              setIntervalSize={setIntervalSize}
              intervalSize={intervalSize}
            />
            <LogTextWrapControls wrap={textWrap} setTextWrap={setTextWrap} />
            <LogTextScaleControls
              availableTextScales={availableTextScales}
              textScale={textScale}
              setTextScale={setTextScale}
            />
          </LogCustomizationMenu>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <WithLogPosition resetOnUnmount>
            {({
              visibleMidpointTime,
              isAutoReloading,
              jumpToTargetPositionTime,
              startLiveStreaming,
              stopLiveStreaming,
            }) => (
              <LogTimeControls
                currentTime={visibleMidpointTime}
                isLiveStreaming={isAutoReloading}
                jumpToTime={jumpToTargetPositionTime}
                startLiveStreaming={interval => {
                  startLiveStreaming(interval);
                  setSurroundingLogsId(null);
                }}
                stopLiveStreaming={stopLiveStreaming}
              />
            )}
          </WithLogPosition>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Toolbar>
  );
});
