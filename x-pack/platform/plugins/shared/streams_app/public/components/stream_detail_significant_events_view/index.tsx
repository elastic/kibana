/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useAIFeatures } from '../../hooks/use_ai_features';
import { useFetchSignificantEvents } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../hooks/use_time_range_update';
import { useTimefilter } from '../../hooks/use_timefilter';
import { LoadingPanel } from '../loading_panel';
import { EditSignificantEventFlyout } from './add_significant_event_flyout/edit_significant_event_flyout';
import type { Flow } from './add_significant_event_flyout/types';
import { EmptyState } from './empty_state';
import { RulesTable } from './rules_table';
import { SignificantEventsTable } from './significant_events_table';

interface Props {
  definition: Streams.all.GetResponse;
}

export function StreamDetailSignificantEventsView({ definition }: Props) {
  const { rangeFrom, rangeTo } = useTimeRange();
  const { updateTimeRange } = useTimeRangeUpdate();
  const { refresh } = useTimefilter();
  const {
    dependencies: {
      start: { unifiedSearch },
    },
  } = useKibana();
  const aiFeatures = useAIFeatures();

  const [query, setQuery] = useState<string>('');
  const [tableSearchValue, setTableSearchValue] = useState('');
  const [isTypeFilterPopoverOpen, setIsTypeFilterPopoverOpen] = useState(false);
  const [typeFilterOptions, setTypeFilterOptions] = useState<EuiSelectableOption[]>([
    {
      key: 'knowledge_indicator',
      checked: 'on',
      label: i18n.translate(
        'xpack.streams.significantEventsTable.typeFilter.knowledgeIndicatorsLabel',
        {
          defaultMessage: 'Knowledge Indicators',
        }
      ),
    },
    {
      key: 'rule',
      label: i18n.translate('xpack.streams.significantEventsTable.typeFilter.rulesLabel', {
        defaultMessage: 'Rules',
      }),
    },
  ]);
  const significantEventsFetchState = useFetchSignificantEvents({
    name: definition.stream.name,
    query,
  });
  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);
  const [initialFlow, setInitialFlow] = useState<Flow | undefined>('ai');

  const [queryToEdit, setQueryToEdit] = useState<StreamQuery | undefined>();
  const [dateRange, setDateRange] = useState<TimeRange>({ from: rangeFrom, to: rangeTo });
  const typeFilterPopoverId = useGeneratedHtmlId({
    prefix: 'significantEventsTypeFilterPopover',
  });

  const isRulesSelected = useMemo(
    () => typeFilterOptions.some((option) => option.key === 'rule' && option.checked === 'on'),
    [typeFilterOptions]
  );

  if (!significantEventsFetchState.data && significantEventsFetchState.isLoading) {
    return <LoadingPanel size="xxl" />;
  }

  const editFlyout = (generateOnMount: boolean) => (
    <EditSignificantEventFlyout
      setIsEditFlyoutOpen={setIsEditFlyoutOpen}
      isEditFlyoutOpen={isEditFlyoutOpen}
      definition={definition}
      refresh={significantEventsFetchState.refetch}
      queryToEdit={queryToEdit}
      setQueryToEdit={setQueryToEdit}
      initialFlow={initialFlow}
      generateOnMount={generateOnMount}
      aiFeatures={aiFeatures}
    />
  );

  const noSignificantEvents =
    !query &&
    !significantEventsFetchState.isLoading &&
    significantEventsFetchState.data &&
    significantEventsFetchState.data.significant_events.length === 0;

  if (noSignificantEvents) {
    return (
      <>
        <EmptyState
          onManualEntryClick={() => {
            setQueryToEdit(undefined);
            setInitialFlow('manual');
            setIsEditFlyoutOpen(true);
          }}
          onGenerateSuggestionsClick={() => {
            setInitialFlow('ai');
            setIsEditFlyoutOpen(true);
          }}
        />
        {editFlyout(true)}
      </>
    );
  }

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow>
              <unifiedSearch.ui.SearchBar
                appName="streamsApp"
                showFilterBar={false}
                showQueryMenu={false}
                showQueryInput={true}
                submitButtonStyle="iconOnly"
                displayStyle="inPage"
                disableQueryLanguageSwitcher
                onQuerySubmit={(queryN) => {
                  setQuery(String(queryN.query?.query ?? ''));

                  if (isEqual(queryN.dateRange, dateRange)) {
                    refresh();
                  } else if (queryN.dateRange) {
                    updateTimeRange(queryN.dateRange);
                    setDateRange(queryN.dateRange);
                  }
                }}
                query={{
                  query,
                  language: 'text',
                }}
                isLoading={significantEventsFetchState.isLoading}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill={true}
                size="s"
                color="primary"
                onClick={() => {
                  setIsEditFlyoutOpen(true);
                  setQueryToEdit(undefined);
                }}
                iconType="plus"
                data-test-subj="significant_events_existing_queries_open_flyout_button"
              >
                {i18n.translate('xpack.streams.significantEvents.addSignificantEventButton', {
                  defaultMessage: 'Significant events',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder={false} hasShadow={true}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              css={css`
                width: 100%;
                min-height: 44px;
              `}
            >
              <EuiFlexItem grow={false}>
                <EuiPopover
                  id={typeFilterPopoverId}
                  aria-label={i18n.translate(
                    'xpack.streams.significantEventsTable.typeFilterPopoverLabel',
                    {
                      defaultMessage: 'Type filter',
                    }
                  )}
                  button={
                    <EuiButton
                      iconType="arrowDown"
                      iconSide="right"
                      color="text"
                      onClick={() => setIsTypeFilterPopoverOpen((isOpen) => !isOpen)}
                    >
                      {i18n.translate('xpack.streams.significantEventsTable.typeFilterLabel', {
                        defaultMessage: 'Type',
                      })}
                    </EuiButton>
                  }
                  isOpen={isTypeFilterPopoverOpen}
                  closePopover={() => setIsTypeFilterPopoverOpen(false)}
                  panelPaddingSize="none"
                >
                  <EuiSelectable
                    aria-label={i18n.translate(
                      'xpack.streams.significantEventsTable.typeFilterSelectableAriaLabel',
                      {
                        defaultMessage: 'Filter by type',
                      }
                    )}
                    singleSelection="always"
                    options={typeFilterOptions}
                    onChange={(options) => {
                      setTypeFilterOptions(options);
                      setIsTypeFilterPopoverOpen(false);
                    }}
                  >
                    {(list) => (
                      <div
                        css={css`
                          min-width: 260px;
                        `}
                      >
                        {list}
                      </div>
                    )}
                  </EuiSelectable>
                </EuiPopover>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFieldSearch
                  fullWidth
                  value={tableSearchValue}
                  onChange={(event) => setTableSearchValue(event.target.value)}
                  placeholder={i18n.translate(
                    'xpack.streams.significantEventsTable.searchPlaceholder',
                    {
                      defaultMessage: 'Search significant events',
                    }
                  )}
                  aria-label={i18n.translate(
                    'xpack.streams.significantEventsTable.searchAriaLabel',
                    {
                      defaultMessage: 'Search significant events',
                    }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            {isRulesSelected ? <RulesTable /> : <SignificantEventsTable />}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      {editFlyout(false)}
    </>
  );
}
