/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Graph Streams demo page — /app/streams/_graph
 *
 * Lets a user:
 *  1. Pick a preset topology (k8s, e-commerce, firewall).
 *  2. Load it (provisions graph nodes via POST /internal/streams/_graph).
 *  3. Edit a sample document and test-route it (POST /internal/streams/_graph/_route_test).
 *  4. Delete the topology when done.
 */

import React, { useCallback, useState } from 'react';
import {
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
import type { GraphPreset } from './presets';

// ---------------------------------------------------------------------------
// Types mirroring the server route responses
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

const TopologySummary = ({ preset }: { preset: GraphPreset }) => {
  const { topology } = preset;

  const edgeRows = topology.routing.map((edge, idx) => ({
    id: idx,
    from: edge.from,
    to: edge.to,
    condition: edge.where ? JSON.stringify(edge.where) : '(always)',
  }));

  return (
    <>
      <EuiFlexGroup wrap>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.streams.graphDemo.sourcesLabel', {
                defaultMessage: 'Sources',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          {Object.keys(topology.sources ?? {}).map((id) => (
            <EuiBadge key={id} color="primary">
              {id}
            </EuiBadge>
          ))}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.streams.graphDemo.pipelinesLabel', {
                defaultMessage: 'Pipelines',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          {Object.keys(topology.pipelines ?? {}).map((id) => (
            <EuiBadge key={id} color="accent">
              {id}
            </EuiBadge>
          ))}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.streams.graphDemo.destinationsLabel', {
                defaultMessage: 'Destinations',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          {Object.keys(topology.destinations ?? {}).map((id) => (
            <EuiBadge key={id} color="success">
              {id}
            </EuiBadge>
          ))}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption="Routing edges"
        items={edgeRows}
        columns={[
          { field: 'from', name: 'From', width: '25%' },
          { field: 'to', name: 'To', width: '25%' },
          { field: 'condition', name: 'Condition', truncateText: true },
        ]}
        rowHeader="from"
      />
    </>
  );
};

const LoadResultPanel = ({ result }: { result: LoadResult }) => {
  const hasErrors = result.results.some((r) => r.status === 'error');
  return (
    <EuiCallOut
      title={
        hasErrors
          ? i18n.translate('xpack.streams.graphDemo.loadPartialError', {
              defaultMessage: 'Topology loaded with errors',
            })
          : i18n.translate('xpack.streams.graphDemo.loadSuccess', {
              defaultMessage: 'Topology "{name}" loaded — {count} nodes',
              values: { name: result.topology, count: result.nodes.length },
            })
      }
      color={hasErrors ? 'warning' : 'success'}
      iconType={hasErrors ? 'warning' : 'check'}
    >
      <EuiBasicTable
        items={result.results}
        columns={[
          { field: 'name', name: 'Node' },
          {
            field: 'status',
            name: 'Status',
            render: (status: string) => (
              <EuiBadge color={status === 'created' ? 'success' : 'danger'}>{status}</EuiBadge>
            ),
          },
          { field: 'error', name: 'Error', render: (err?: string) => err ?? '—' },
        ]}
      />
    </EuiCallOut>
  );
};

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

  const [selectedPresetId, setSelectedPresetId] = useState<string>(GRAPH_PRESETS[0].id);
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null);
  const [loadLoading, setLoadLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [docText, setDocText] = useState<string>(() =>
    JSON.stringify(GRAPH_PRESETS[0].sampleDocument, null, 2)
  );
  const [routeTestResult, setRouteTestResult] = useState<RouteTestResult | null>(null);
  const [routeTestLoading, setRouteTestLoading] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  const selectedPreset = GRAPH_PRESETS.find((p) => p.id === selectedPresetId) ?? GRAPH_PRESETS[0];

  const handlePresetChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPresetId(id);
    const preset = GRAPH_PRESETS.find((p) => p.id === id);
    if (preset) {
      setDocText(JSON.stringify(preset.sampleDocument, null, 2));
    }
    setLoadResult(null);
    setRouteTestResult(null);
    setDeleteResult(null);
    setLoadError(null);
  }, []);

  const handleLoad = useCallback(async () => {
    setLoadLoading(true);
    setLoadError(null);
    setLoadResult(null);
    setRouteTestResult(null);
    try {
      const result = await streamsRepositoryClient.fetch('POST /internal/streams/_graph', {
        params: {
          body: selectedPreset.topology as Parameters<
            typeof streamsRepositoryClient.fetch<'POST /internal/streams/_graph'>
          >[1]['params']['body'],
        },
      });
      setLoadResult(result);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadLoading(false);
    }
  }, [selectedPreset, streamsRepositoryClient]);

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
            body: {
              source: selectedPreset.entrySource,
              document: parsedDoc,
            },
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

  const handleDelete = useCallback(async () => {
    setDeleteLoading(true);
    setDeleteResult(null);
    try {
      await streamsRepositoryClient.fetch('DELETE /internal/streams/_graph/{topology}', {
        params: {
          path: { topology: selectedPreset.topology.name },
          body: selectedPreset.topology as Parameters<
            typeof streamsRepositoryClient.fetch<'DELETE /internal/streams/_graph/{topology}'>
          >[1]['params']['body'],
        },
      });
      setLoadResult(null);
      setRouteTestResult(null);
      setDeleteResult(`Topology "${selectedPreset.topology.name}" deleted`);
    } catch (err) {
      setDeleteResult(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeleteLoading(false);
    }
  }, [selectedPreset, streamsRepositoryClient]);

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={i18n.translate('xpack.streams.graphDemo.pageTitle', {
          defaultMessage: 'Graph Streams demo',
        })}
        description={i18n.translate('xpack.streams.graphDemo.pageDescription', {
          defaultMessage:
            'Prototype: provision a non-hierarchical graph topology and test-route documents through it. ' +
            'Powered by ES reroute ingest processors on the streams-kbn branch.',
        })}
      />
      <StreamsAppPageTemplate.Body>
        {/* Preset selector */}
        <EuiPanel hasBorder paddingSize="m">
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.streams.graphDemo.step1', {
                defaultMessage: '1. Choose a topology',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFormRow
            label={i18n.translate('xpack.streams.graphDemo.presetLabel', {
              defaultMessage: 'Preset topology',
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
          <TopologySummary preset={selectedPreset} />
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton fill isLoading={loadLoading} onClick={handleLoad} iconType="play">
                {i18n.translate('xpack.streams.graphDemo.loadButton', {
                  defaultMessage: 'Load topology',
                })}
              </EuiButton>
            </EuiFlexItem>
            {loadResult && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="danger"
                  isLoading={deleteLoading}
                  onClick={handleDelete}
                  iconType="trash"
                >
                  {i18n.translate('xpack.streams.graphDemo.deleteButton', {
                    defaultMessage: 'Delete topology',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {loadError && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut title="Load failed" color="danger" iconType="error">
                <EuiText size="s">
                  <pre>{loadError}</pre>
                </EuiText>
              </EuiCallOut>
            </>
          )}
          {deleteResult && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                title={deleteResult}
                color={deleteResult.startsWith('Delete failed') ? 'danger' : 'success'}
                iconType={deleteResult.startsWith('Delete failed') ? 'error' : 'check'}
              />
            </>
          )}
          {loadResult && (
            <>
              <EuiSpacer size="m" />
              <LoadResultPanel result={loadResult} />
            </>
          )}
        </EuiPanel>

        <EuiSpacer size="m" />

        {/* Route test */}
        <EuiPanel hasBorder paddingSize="m">
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.streams.graphDemo.step2', {
                defaultMessage: '2. Test-route a document',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.streams.graphDemo.routeTestHint', {
                defaultMessage:
                  'Edit the sample document below and click "Test route" to see which node it lands in. ' +
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
              rows={12}
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiButton
            fill
            isLoading={routeTestLoading}
            disabled={!loadResult}
            onClick={handleRouteTest}
            iconType="inspect"
          >
            {i18n.translate('xpack.streams.graphDemo.routeTestButton', {
              defaultMessage: 'Test route',
            })}
          </EuiButton>
          {!loadResult && (
            <EuiText size="xs" color="subdued" style={{ display: 'inline', marginLeft: 8 }}>
              {i18n.translate('xpack.streams.graphDemo.routeTestDisabledHint', {
                defaultMessage: 'Load the topology first',
              })}
            </EuiText>
          )}
          {routeTestResult && (
            <>
              <EuiSpacer size="m" />
              <RouteTestResultPanel result={routeTestResult} />
            </>
          )}
        </EuiPanel>
      </StreamsAppPageTemplate.Body>
    </>
  );
};
