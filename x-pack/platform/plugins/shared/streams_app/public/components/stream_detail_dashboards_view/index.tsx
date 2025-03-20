/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSearchBar } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import type { SanitizedDashboardAsset } from '@kbn/streams-plugin/server/routes/dashboards/route';
import {
  IngestStreamGetResponse,
  ProcessorDefinition,
  isDslLifecycle,
  isIlmLifecycle,
} from '@kbn/streams-schema';
// @ts-expect-error
import { saveAs } from '@elastic/filesaver';
import { AddDashboardFlyout } from './add_dashboard_flyout';
import { DashboardsTable } from './dashboard_table';
import { useDashboardsApi } from '../../hooks/use_dashboards_api';
import { useDashboardsFetch } from '../../hooks/use_dashboards_fetch';
import { ImportContentPackFlyout, processorLabel } from './content_pack_flyout';
import { useKibana } from '../../hooks/use_kibana';

export function StreamDetailDashboardsView({
  definition,
  refreshDefinition,
}: {
  definition?: IngestStreamGetResponse;
  refreshDefinition: () => void;
}) {
  const [query, setQuery] = useState('');

  const [isAddDashboardFlyoutOpen, setIsAddDashboardFlyoutOpen] = useState(false);
  const [isImportFlyoutOpen, setIsImportFlyoutOpen] = useState(false);

  const dashboardsFetch = useDashboardsFetch(definition?.stream.name);
  const { addDashboards, removeDashboards } = useDashboardsApi(definition?.stream.name);

  const [isUnlinkLoading, setIsUnlinkLoading] = useState(false);
  const linkedDashboards = useMemo(() => {
    if (!definition) return [];

    const processors = definition.stream.ingest.processing.map(
      (processor: ProcessorDefinition, i: number) => {
        const label = processorLabel(processor);
        return { id: `processor-${i}`, label, tags: [] };
      }
    );

    return [
      ...processors,
      ...(isDslLifecycle(definition.effective_lifecycle) ||
      isIlmLifecycle(definition.effective_lifecycle)
        ? [
            {
              id: 'lifecycle',
              label: isDslLifecycle(definition.effective_lifecycle)
                ? `DSL (${
                    definition.effective_lifecycle.dsl.data_retention || 'Indefinite'
                  } retention)`
                : `ILM (policy ${definition.effective_lifecycle.ilm.policy})`,
              tags: [],
            },
          ]
        : []),
      ...(dashboardsFetch.value?.dashboards ?? []),
    ];
  }, [definition, dashboardsFetch.value?.dashboards]);

  const filteredDashboards = useMemo(() => {
    return linkedDashboards.filter((dashboard) => {
      return dashboard.label.toLowerCase().includes(query.toLowerCase());
    });
  }, [linkedDashboards, query]);

  const [selectedDashboards, setSelectedDashboards] = useState<SanitizedDashboardAsset[]>([]);
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s">
          {selectedDashboards.length > 0 && (
            <>
              <EuiButton
                data-test-subj="streamsAppStreamDetailRemoveDashboardButton"
                iconType="trash"
                isLoading={isUnlinkLoading}
                onClick={async () => {
                  try {
                    setIsUnlinkLoading(true);

                    await removeDashboards(selectedDashboards);
                    dashboardsFetch.refresh();

                    setSelectedDashboards([]);
                  } finally {
                    setIsUnlinkLoading(false);
                  }
                }}
                color="danger"
              >
                {i18n.translate(
                  'xpack.streams.streamDetailDashboardView.removeSelectedButtonLabel',
                  {
                    defaultMessage: 'Unlink selected',
                  }
                )}
              </EuiButton>

              <EuiButton
                data-test-subj="streamsAppStreamDetailExportContentPackButton"
                iconType="exportAction"
                isDisabled={!definition}
                isLoading={isUnlinkLoading}
                onClick={async () => {
                  if (!definition) {
                    return;
                  }

                  const exportedAssets:
                    | (
                        | { type: 'dashboard'; id: string }
                        | { type: 'processor'; processor: ProcessorDefinition }
                        | { type: 'lifecycle' }
                      )[] = selectedDashboards.map((asset) => {
                    if (asset.id.startsWith('processor-')) {
                      const id = Number(asset.id.split('-')[1]);
                      return {
                        type: 'processor',
                        processor: definition.stream.ingest.processing[id],
                      };
                    }

                    if (asset.id === 'lifecycle') {
                      return { type: 'lifecycle' };
                    }

                    return { type: 'dashboard', id: asset.id };
                  });

                  streamsRepositoryClient
                    .fetch('POST /api/streams/{name}/content/export 2023-10-31', {
                      params: {
                        path: { name: definition.stream.name },
                        body: { assets: exportedAssets },
                      },
                      signal: new AbortController().signal,
                    })
                    .then((response) => {
                      saveAs(
                        new Blob([JSON.stringify(response)], { type: 'application/json' }),
                        'content.json'
                      );
                    });
                }}
                color="primary"
              >
                {i18n.translate(
                  'xpack.streams.streamDetailDashboardView.exportContentPackButtonLabel',
                  {
                    defaultMessage: 'Export as content pack',
                  }
                )}
              </EuiButton>
            </>
          )}
          <EuiSearchBar
            query={query}
            box={{
              incremental: true,
            }}
            onChange={(nextQuery) => {
              setQuery(nextQuery.queryText);
            }}
          />
          <EuiButton
            data-test-subj="streamsAppStreamDetailAddDashboardButton"
            iconType="plusInCircle"
            onClick={() => {
              setIsAddDashboardFlyoutOpen(true);
            }}
          >
            {i18n.translate('xpack.streams.streamDetailDashboardView.addADashboardButtonLabel', {
              defaultMessage: 'Add a dashboard',
            })}
          </EuiButton>
          <EuiButton
            data-test-subj="streamsAppStreamDetailImportFromContentPack"
            iconType="importAction"
            onClick={() => {
              setIsImportFlyoutOpen(true);
            }}
          >
            {i18n.translate(
              'xpack.streams.streamDetailDashboardView.importFromContentPackButtonLabel',
              {
                defaultMessage: 'Import from content pack',
              }
            )}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <DashboardsTable
          entityId={definition?.stream.name}
          dashboards={filteredDashboards}
          loading={dashboardsFetch.loading}
          selectedDashboards={selectedDashboards}
          setSelectedDashboards={setSelectedDashboards}
        />
        {definition && isAddDashboardFlyoutOpen ? (
          <AddDashboardFlyout
            linkedDashboards={linkedDashboards}
            entityId={definition.stream.name}
            onAddDashboards={async (dashboards) => {
              await addDashboards(dashboards);
              dashboardsFetch.refresh();
              setIsAddDashboardFlyoutOpen(false);
            }}
            onClose={() => {
              setIsAddDashboardFlyoutOpen(false);
            }}
          />
        ) : null}
        {definition && isImportFlyoutOpen ? (
          <ImportContentPackFlyout
            definition={definition}
            onImport={() => {
              refreshDefinition();
              dashboardsFetch.refresh();
              setIsImportFlyoutOpen(false);
            }}
            onClose={() => {
              setIsImportFlyoutOpen(false);
            }}
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
