/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Graph Streams demo page — /app/streams/_graph
 *
 * Flow:
 *  1. "Load all topologies" button at the top provisions all presets at once.
 *  2. Pick a topology from the dropdown and view the graph.
 *  3. Edit the sample document and click "Test route" to simulate routing.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { GRAPH_PRESETS } from './presets';
import { TopologyGraph } from './topology_graph';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoadResult {
  topology: string;
  nodes: string[];
  results: Array<{ name: string; status: 'created' | 'error'; error?: string }>;
}

interface RouteTestResult {
  landedIn?: string;
  executedPipelines?: string[];
  document?: Record<string, unknown>;
  error?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const AllLoadResultsPanel = ({ results }: { results: LoadResult[] }) => (
  <>
    {results.map((r) => {
      const hasErrors = r.results.some((n) => n.status === 'error');
      return (
        <React.Fragment key={r.topology}>
          <EuiText size="s">
            <strong>{r.topology}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiBasicTable
            items={r.results}
            columns={[
              { field: 'name', name: 'Node', width: '40%' },
              {
                field: 'status',
                name: 'Status',
                width: '15%',
                render: (status: string) => (
                  <EuiBadge color={status === 'created' ? 'success' : 'danger'}>{status}</EuiBadge>
                ),
              },
              {
                field: 'error',
                name: 'Error',
                render: (err?: string) => (
                  <EuiText size="xs" color={err ? 'danger' : 'subdued'}>
                    {err ?? '—'}
                  </EuiText>
                ),
              },
            ]}
          />
          {hasErrors && <EuiSpacer size="s" />}
          <EuiSpacer size="m" />
        </React.Fragment>
      );
    })}
  </>
);

const RouteTestResultPanel = ({ result }: { result: RouteTestResult }) => {
  if (result.error) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.streams.graphDemo.routeTestError', {
          defaultMessage: 'Route test error',
        })}
        color="danger"
        iconType="error"
      >
        <EuiText size="s">
          <pre>{result.error}</pre>
        </EuiText>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.streams.graphDemo.routeTestLanded', {
          defaultMessage: 'Document landed in: {node}',
          values: { node: result.landedIn ?? '(unknown)' },
        })}
        color="success"
        iconType="check"
      >
        <EuiText size="s">
          <strong>
            {i18n.translate('xpack.streams.graphDemo.executedPipelines', {
              defaultMessage: 'Executed pipelines:',
            })}
          </strong>{' '}
          {(result.executedPipelines ?? []).join(' → ') || '(none)'}
        </EuiText>
      </EuiCallOut>
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.streams.graphDemo.transformedDoc', {
            defaultMessage: 'Transformed document',
          })}
        </h4>
      </EuiTitle>
      <EuiCodeBlock language="json" isCopyable overflowHeight={240}>
        {JSON.stringify(result.document ?? {}, null, 2)}
      </EuiCodeBlock>
    </>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export const GraphStreamsDemoPage = () => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  // ---- load-all state ----
  const [loadAllLoading, setLoadAllLoading] = useState(false);
  const [loadAllResults, setLoadAllResults] = useState<LoadResult[] | null>(null);
  const [allLoaded, setAllLoaded] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  // ---- preset / graph state ----
  const [selectedPresetId, setSelectedPresetId] = useState<string>(GRAPH_PRESETS[0].id);
  const [docText, setDocText] = useState<string>(() =>
    JSON.stringify(GRAPH_PRESETS[0].sampleDocument, null, 2)
  );

  // ---- route test state ----
  const [routeTestResult, setRouteTestResult] = useState<RouteTestResult | null>(null);
  const [routeTestLoading, setRouteTestLoading] = useState(false);
  const routeTestResultRef = useRef<HTMLDivElement>(null);

  const selectedPreset = GRAPH_PRESETS.find((p) => p.id === selectedPresetId) ?? GRAPH_PRESETS[0];

  useEffect(() => {
    if (routeTestResult) {
      routeTestResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [routeTestResult]);

  const handlePresetChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPresetId(id);
    const preset = GRAPH_PRESETS.find((p) => p.id === id);
    if (preset) setDocText(JSON.stringify(preset.sampleDocument, null, 2));
    setRouteTestResult(null);
  }, []);

  // Load all presets sequentially (state machine processes one change set at a time)
  const handleLoadAll = useCallback(async () => {
    setLoadAllLoading(true);
    setLoadAllResults(null);
    setRouteTestResult(null);

    const results: LoadResult[] = [];
    for (const preset of GRAPH_PRESETS) {
      try {
        const result = await streamsRepositoryClient.fetch('POST /internal/streams/_graph', {
          params: {
            body: preset.topology as Parameters<
              typeof streamsRepositoryClient.fetch<'POST /internal/streams/_graph'>
            >[1]['params']['body'],
          },
        });
        results.push(result);
      } catch (err) {
        results.push({
          topology: preset.topology.name,
          nodes: [],
          results: [
            {
              name: preset.topology.name,
              status: 'error',
              error: err instanceof Error ? err.message : String(err),
            },
          ],
        });
      }
    }

    setLoadAllResults(results);
    setAllLoaded(true);
    setLoadAllLoading(false);
  }, [streamsRepositoryClient]);

  // Delete all presets sequentially
  const handleDeleteAll = useCallback(async () => {
    setDeleteAllLoading(true);
    for (const preset of GRAPH_PRESETS) {
      try {
        await streamsRepositoryClient.fetch('DELETE /internal/streams/_graph/{topology}', {
          params: {
            path: { topology: preset.topology.name },
            body: preset.topology as Parameters<
              typeof streamsRepositoryClient.fetch<'DELETE /internal/streams/_graph/{topology}'>
            >[1]['params']['body'],
          },
        });
      } catch {
        // best-effort — continue deleting others even if one fails
      }
    }
    setLoadAllResults(null);
    setAllLoaded(false);
    setRouteTestResult(null);
    setDeleteAllLoading(false);
  }, [streamsRepositoryClient]);

  const handleRouteTest = useCallback(async () => {
    let parsedDoc: Record<string, unknown>;
    try {
      parsedDoc = JSON.parse(docText) as Record<string, unknown>;
    } catch {
      setRouteTestResult({ error: 'Invalid JSON in sample document' });
      return;
    }

    setRouteTestLoading(true);
    setRouteTestResult(null);
    try {
      const result = await streamsRepositoryClient.fetch(
        'POST /internal/streams/_graph/_route_test',
        {
          params: {
            body: { source: selectedPreset.entrySource, document: parsedDoc },
          },
        }
      );
      setRouteTestResult(result);
    } catch (err) {
      setRouteTestResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setRouteTestLoading(false);
    }
  }, [docText, selectedPreset, streamsRepositoryClient]);

  // Derive accordion button label
  const totalNodes = loadAllResults?.reduce((sum, r) => sum + r.nodes.length, 0) ?? 0;
  const hasLoadErrors = loadAllResults?.some((r) => r.results.some((n) => n.status === 'error'));
  const accordionLabel = hasLoadErrors
    ? i18n.translate('xpack.streams.graphDemo.loadedWithErrors', {
        defaultMessage: '{count} topologies loaded (with errors)',
        values: { count: loadAllResults?.length ?? 0 },
      })
    : i18n.translate('xpack.streams.graphDemo.loadedOk', {
        defaultMessage: '{topologies} topologies · {nodes} nodes provisioned',
        values: { topologies: loadAllResults?.length ?? 0, nodes: totalNodes },
      });

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={i18n.translate('xpack.streams.graphDemo.pageTitle', {
          defaultMessage: 'Graph Streams demo',
        })}
        description={i18n.translate('xpack.streams.graphDemo.pageDescription', {
          defaultMessage:
            'Prototype: provision non-hierarchical graph topologies and test-route documents through them. ' +
            'Powered by ES reroute ingest processors on the streams-kbn branch.',
        })}
        rightSideItems={[
          allLoaded ? (
            <EuiButtonEmpty
              key="delete"
              color="danger"
              isLoading={deleteAllLoading}
              onClick={handleDeleteAll}
              iconType="trash"
              size="s"
            >
              {i18n.translate('xpack.streams.graphDemo.deleteAllButton', {
                defaultMessage: 'Delete all',
              })}
            </EuiButtonEmpty>
          ) : null,
          <EuiButton
            key="load"
            fill
            size="s"
            isLoading={loadAllLoading}
            onClick={handleLoadAll}
            iconType="play"
          >
            {i18n.translate('xpack.streams.graphDemo.loadAllButton', {
              defaultMessage: 'Load all topologies',
            })}
          </EuiButton>,
        ].filter(Boolean)}
      />
      <StreamsAppPageTemplate.Body>
        {/* Load results accordion */}
        {loadAllResults && (
          <>
            <EuiAccordion
              id="load-all-results"
              buttonContent={accordionLabel}
              initialIsOpen={!!hasLoadErrors}
              paddingSize="m"
            >
              <AllLoadResultsPanel results={loadAllResults} />
            </EuiAccordion>
            <EuiSpacer size="m" />
          </>
        )}

        {/* Topology explorer */}
        <EuiPanel hasBorder paddingSize="m">
          <EuiFormRow
            label={i18n.translate('xpack.streams.graphDemo.presetLabel', {
              defaultMessage: 'Topology',
            })}
          >
            <EuiSelect
              options={GRAPH_PRESETS.map((p) => ({ value: p.id, text: p.label }))}
              value={selectedPresetId}
              onChange={handlePresetChange}
            />
          </EuiFormRow>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>{selectedPreset.description}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <TopologyGraph
            preset={selectedPreset}
            executedPipelines={routeTestResult?.executedPipelines}
            landedIn={routeTestResult?.landedIn}
          />
        </EuiPanel>

        <EuiSpacer size="m" />

        {/* Route test */}
        <EuiPanel hasBorder paddingSize="m">
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.streams.graphDemo.routeTestTitle', {
                defaultMessage: 'Test-route a document',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.streams.graphDemo.routeTestHint', {
                defaultMessage:
                  'Edit the sample document and click "Test route" to see which node it lands in. ' +
                  'Uses ES cluster-level simulate ingest — no data is persisted.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFormRow
            label={i18n.translate('xpack.streams.graphDemo.entrySourceLabel', {
              defaultMessage: 'Entry source: {source}',
              values: { source: selectedPreset.entrySource },
            })}
            fullWidth
          >
            <EuiTextArea
              fullWidth
              rows={10}
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={routeTestLoading}
                disabled={!allLoaded}
                onClick={handleRouteTest}
                iconType="inspect"
              >
                {i18n.translate('xpack.streams.graphDemo.routeTestButton', {
                  defaultMessage: 'Test route',
                })}
              </EuiButton>
            </EuiFlexItem>
            {!allLoaded && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.streams.graphDemo.routeTestDisabledHint', {
                    defaultMessage: 'Load topologies first',
                  })}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {routeTestResult && (
            <div ref={routeTestResultRef}>
              <EuiSpacer size="m" />
              <RouteTestResultPanel result={routeTestResult} />
            </div>
          )}
        </EuiPanel>
      </StreamsAppPageTemplate.Body>
    </>
  );
};
