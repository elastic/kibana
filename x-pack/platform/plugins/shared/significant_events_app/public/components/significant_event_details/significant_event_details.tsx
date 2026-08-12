/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import type {
  SignalEntry,
  SignificantEvent,
  SignificantEventResponse,
} from '@kbn/significant-events-schema';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';
import {
  appendToESQLQuery,
  formatESQLColumns,
  getESQLAdHocDataview,
  getESQLResults,
} from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { ESQLRow } from '@kbn/es-types';
import { formatTimestamp } from '../../util/formatters';
import { InfoPanel } from '../info_panel';
import { useKibana } from '../../hooks/use_kibana';

const DESCRIPTION_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.descriptionTitle',
  { defaultMessage: 'Description' }
);

const LOAD_ERROR_TITLE = i18n.translate('xpack.significantEventsApp.signalEvidence.loadError', {
  defaultMessage: 'Failed to load logs',
});
const ESQL_QUERY_TITLE = i18n.translate('xpack.significantEventsApp.signalEvidence.esqlTitle', {
  defaultMessage: 'ES|QL query',
});

interface GridState {
  rows: ESQLRow[];
  columns: DatatableColumn[];
  dataView: DataView;
}

interface DetectionSignalRowProps {
  signal: Extract<SignalEntry, { type: 'detection' }>;
}

const DetectionSignalRow = ({ signal }: DetectionSignalRowProps) => {
  const { core, dependencies } = useKibana();
  const { data } = dependencies.start;
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'sigEventSignal' });

  const [grid, setGrid] = useState<GridState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const hasFetchStarted = useRef(false);

  const esqlQuery = signal.evidence?.esql_query;

  const onToggle = useCallback(
    (isOpen: boolean) => {
      if (!isOpen || hasFetchStarted.current || !esqlQuery) return;
      hasFetchStarted.current = true;
      setIsLoading(true);

      const limitedQuery = appendToESQLQuery(esqlQuery, '| LIMIT 5');

      Promise.all([
        getESQLAdHocDataview({
          dataViewsService: data.dataViews,
          query: limitedQuery,
          options: { skipFetchFields: true },
          http: core.http,
        }),
        getESQLResults({ esqlQuery: limitedQuery, search: data.search.search }),
      ])
        .then(([dataView, results]) => {
          setGrid({
            rows: results.response.values as ESQLRow[],
            columns: formatESQLColumns(results.response.columns),
            dataView,
          });
        })
        .catch((err) => {
          setFetchError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [esqlQuery, data, core.http]
  );

  // Header wraps in the accordion button so multiple signals don't overflow.
  const buttonContent = (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      {signal.metadata?.rule_name && (
        <EuiFlexItem grow={false}>
          <EuiText size="s" textAlign="left">
            <strong>{signal.metadata.rule_name}</strong>
          </EuiText>
          {signal.collected_at && (
            <EuiText size="xs" color="subdued">
              {formatTimestamp(signal.collected_at)}
            </EuiText>
          )}
        </EuiFlexItem>
      )}

      {signal.description && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {signal.description}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={buttonContent}
      buttonProps={{ style: { padding: euiTheme.size.m } }}
      onToggle={onToggle}
      data-test-subj="sigEventSignalCard"
    >
      <div css={{ padding: `0 ${euiTheme.size.m} ${euiTheme.size.m}` }}>
        {/* Log sample leads: raw data is the evidence — everything else supports it. */}
        {isLoading && (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {fetchError && (
          <KbnDangerCallout title={LOAD_ERROR_TITLE} size="s" announceOnMount>
            {fetchError}
          </KbnDangerCallout>
        )}

        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          {esqlQuery && (
            <EuiFlexGroup direction="column" responsive={false} gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <strong>{ESQL_QUERY_TITLE}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCodeBlock
                  language="esql"
                  fontSize="s"
                  paddingSize="s"
                  isCopyable
                  overflowHeight={120}
                >
                  {esqlQuery}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {grid && esqlQuery && (
            <EuiFlexItem grow={false}>
              <ESQLDataGrid
                rows={grid.rows}
                columns={grid.columns}
                dataView={grid.dataView}
                query={{ esql: esqlQuery }}
                flyoutType="overlay"
                initialRowHeight={0}
              />
              <EuiSpacer size="m" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
    </EuiAccordion>
  );
};

const SignalListPanel = ({ children }: { children: React.ReactNode[] }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none">
      {React.Children.map(children, (child, index) => (
        <div css={index < children.length - 1 ? { borderBottom: euiTheme.border.thin } : undefined}>
          {child}
        </div>
      ))}
    </EuiPanel>
  );
};

interface SignificantEventDetailsProps {
  event: SignificantEvent | SignificantEventResponse;
}

export const SignificantEventDetails = ({ event }: SignificantEventDetailsProps) => {
  const signals = useMemo(() => event.signals ?? [], [event.signals]);
  const detectionSignals = useMemo(() => signals.filter((s) => s.type === 'detection'), [signals]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {event.summary && (
        <InfoPanel title={DESCRIPTION_TITLE}>
          <EuiText size="s">
            <p>{event.summary}</p>
          </EuiText>
        </InfoPanel>
      )}

      {detectionSignals.length > 0 && (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.significantEventsApp.significantEventsTab.flyout.signals', {
                defaultMessage: 'Signals ({count})',
                values: { count: detectionSignals.length },
              })}
            </h3>
          </EuiTitle>
          <SignalListPanel>
            {detectionSignals.map((signal, idx) => {
              return <DetectionSignalRow key={idx} signal={signal} />;
            })}
          </SignalListPanel>
        </EuiFlexGroup>
      )}
    </EuiFlexGroup>
  );
};
