/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSearchBar,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { Streams } from '@kbn/streams-schema';
import { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import { AddDashboardFlyout } from './add_dashboard_flyout';
import { useDashboardsApi } from '../../hooks/use_dashboards_api';
import { useDashboardsFetch } from '../../hooks/use_dashboards_fetch';
import { ImportContentPackFlyout } from './import_content_pack_flyout';
import { ExportContentPackFlyout } from './export_content_pack_flyout';
import { FeatureFlagStreamsContentPackUIEnabled } from '../../../common/feature_flags';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { ContentPackObjectsList } from './content_pack_objects_list';
import { ContentPackEntry } from '@kbn/content-packs-schema';

export function StreamDetailContentView({
  definition,
}: {
  definition: Streams.ingest.all.GetResponse;
}) {
  const [query, setQuery] = useState('');
  const { refresh: refreshDefinition } = useStreamDetail();

  const [isAddDashboardFlyoutOpen, setIsAddDashboardFlyoutOpen] = useState(false);
  const [isImportFlyoutOpen, setIsImportFlyoutOpen] = useState(false);
  const [isExportFlyoutOpen, setIsExportFlyoutOpen] = useState(false);

  const dashboardsFetch = useDashboardsFetch(definition?.stream.name);
  const { addDashboards } = useDashboardsApi(definition?.stream.name);

  const contentObjects = useMemo(() => {
    return [
      ...(dashboardsFetch.value?.dashboards ?? []).map((dashboard) => ({
        id: dashboard.id,
        type: 'dashboard' as const,
        attributes: {
          title: dashboard.title,
        },
      })),
      ...(Streams.WiredStream.GetResponse.is(definition)
        ? [
            {
              id: 'Fields',
              type: 'fields' as const,
              content: definition.stream.ingest.wired.fields,
            },
          ]
        : []),
      ...(definition.stream.ingest.processing.length > 0
        ? [
            {
              id: 'Processors',
              type: 'processors' as const,
              content: definition.stream.ingest.processing,
            },
          ]
        : []),
    ] as ContentPackEntry[];
  }, [dashboardsFetch.value?.dashboards]);

  const filteredObjects = useMemo(() => {
    return contentObjects.filter((object) => {
      if (object.type === 'dashboard') {
        return object.attributes.title.toLowerCase().includes(query.toLowerCase());
      }
      return object.id.toLowerCase().includes(query.toLowerCase());
    });
  }, [contentObjects, query]);

  const [selectedObjects, setSelectedObjects] = useState<{ id: string; type: string }[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const {
    core: {
      featureFlags,
      application: {
        capabilities: {
          streams: { [STREAMS_UI_PRIVILEGES.manage]: canLinkAssets },
        },
      },
    },
  } = useKibana();

  const renderContentPackItems = featureFlags.getBooleanValue(
    FeatureFlagStreamsContentPackUIEnabled,
    false
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiSearchBar
            query={query}
            box={{
              incremental: true,
            }}
            onChange={(nextQuery) => {
              setQuery(nextQuery.queryText);
            }}
          />

          {renderContentPackItems && (
            <EuiButton
              data-test-subj="streamsAppStreamDetailExportContentPackButton"
              iconType="exportAction"
              disabled={selectedObjects.length === 0}
              onClick={() => {
                setIsExportFlyoutOpen(true);
              }}
            >
              {i18n.translate('xpack.streams.streamDetailDashboardView.exportContentPackButton', {
                defaultMessage: 'Export as content pack',
              })}
            </EuiButton>
          )}

          {renderContentPackItems ? (
            <EuiPopover
              button={
                <EuiButton
                  iconType="importAction"
                  iconSide="left"
                  color="primary"
                  disabled={!canLinkAssets}
                  onClick={() => setIsPopoverOpen(true)}
                >
                  {i18n.translate(
                    'xpack.streams.streamDetailDashboardView.addDashboardsButtonLabel',
                    {
                      defaultMessage: 'Add',
                    }
                  )}
                </EuiButton>
              }
              isOpen={isPopoverOpen}
              closePopover={() => setIsPopoverOpen(false)}
              panelPaddingSize="none"
              anchorPosition="downLeft"
            >
              <EuiContextMenuPanel
                size="s"
                items={[
                  <EuiContextMenuItem
                    data-test-subj="streamsAppStreamDetailAddDashboardButton"
                    key="addDashboard"
                    icon="plusInCircle"
                    onClick={() => {
                      setIsPopoverOpen(false);
                      setIsAddDashboardFlyoutOpen(true);
                    }}
                  >
                    {i18n.translate(
                      'xpack.streams.streamDetailDashboardView.addADashboardButtonLabel',
                      {
                        defaultMessage: 'Add assets',
                      }
                    )}
                  </EuiContextMenuItem>,

                  <EuiContextMenuItem
                    data-test-subj="streamsAppStreamDetailImportContentPackButton"
                    key="importContentPack"
                    icon="importAction"
                    onClick={() => {
                      setIsPopoverOpen(false);
                      setIsImportFlyoutOpen(true);
                    }}
                  >
                    {i18n.translate(
                      'xpack.streams.streamDetailDashboardView.importContentPackButtonLabel',
                      {
                        defaultMessage: 'Import from content pack',
                      }
                    )}
                  </EuiContextMenuItem>,
                ]}
              />
            </EuiPopover>
          ) : (
            <EuiButton
              data-test-subj="streamsAppStreamDetailAddDashboardButton"
              iconType="plusInCircle"
              disabled={!canLinkAssets}
              onClick={() => {
                setIsAddDashboardFlyoutOpen(true);
              }}
            >
              {i18n.translate('xpack.streams.streamDetailDashboardView.addADashboardButtonLabel', {
                defaultMessage: 'Add a dashboard',
              })}
            </EuiButton>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <ContentPackObjectsList
          objects={filteredObjects}
          selectedObjects={[]}
          onSelectionChange={(selection) => setSelectedObjects(selection)}
        />

        {definition && isAddDashboardFlyoutOpen ? (
          <AddDashboardFlyout
            linkedDashboards={contentObjects.filter(({ type }) => type === 'dashboard')}
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
              dashboardsFetch.refresh();
              refreshDefinition();
              setIsImportFlyoutOpen(false);
            }}
            onClose={() => {
              setIsImportFlyoutOpen(false);
            }}
          />
        ) : null}

        {definition && isExportFlyoutOpen ? (
          <ExportContentPackFlyout
            definition={definition}
            selectedObjects={selectedObjects}
            onExport={() => {
              setIsExportFlyoutOpen(false);
            }}
            onClose={() => {
              setIsExportFlyoutOpen(false);
            }}
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
