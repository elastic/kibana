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
import { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import type { SanitizedDashboardAsset } from '@kbn/streams-plugin/server/routes/dashboards/route';
import type { Streams } from '@kbn/streams-schema';
import React, { useMemo, useState } from 'react';
import { FeatureFlagStreamsContentPackUIEnabled } from '../../../common/feature_flags';
import { useDashboardsApi } from '../../hooks/use_dashboards_api';
import { useDashboardsFetch } from '../../hooks/use_dashboards_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { AddDashboardFlyout } from './add_dashboard_flyout';
import { DashboardsTable } from './dashboard_table';
import { ExportContentPackFlyout } from './export_content_pack_flyout';
import { ImportContentPackFlyout } from './import_content_pack_flyout';

export function StreamDetailDashboardsView({
  definition,
}: {
  definition: Streams.ingest.all.GetResponse;
}) {
  const [query, setQuery] = useState('');

  const [isAddDashboardFlyoutOpen, setIsAddDashboardFlyoutOpen] = useState(false);
  const [isImportFlyoutOpen, setIsImportFlyoutOpen] = useState(false);
  const [isExportFlyoutOpen, setIsExportFlyoutOpen] = useState(false);

  const dashboardsFetch = useDashboardsFetch(definition.stream.name);
  const { addDashboards, removeDashboards } = useDashboardsApi(definition.stream.name);

  const [isUnlinkLoading, setIsUnlinkLoading] = useState(false);
  const linkedDashboards = useMemo(() => {
    return dashboardsFetch.value?.dashboards ?? [];
  }, [dashboardsFetch.value?.dashboards]);

  const filteredDashboards = useMemo(() => {
    return linkedDashboards.filter((dashboard) => {
      return dashboard.title.toLowerCase().includes(query.toLowerCase());
    });
  }, [linkedDashboards, query]);

  const [selectedDashboards, setSelectedDashboards] = useState<SanitizedDashboardAsset[]>([]);
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
          {selectedDashboards.length > 0 && (
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
              {i18n.translate('xpack.streams.streamDetailDashboardView.removeSelectedButtonLabel', {
                defaultMessage: 'Unlink selected',
              })}
            </EuiButton>
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

          {renderContentPackItems && (
            <EuiButton
              data-test-subj="streamsAppStreamDetailExportContentPackButton"
              iconType="exportAction"
              isDisabled={linkedDashboards.length === 0}
              onClick={() => {
                setIsExportFlyoutOpen(true);
              }}
            >
              {i18n.translate('xpack.streams.streamDetailDashboardView.exportContentPackButton', {
                defaultMessage: 'Export content pack',
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
                      defaultMessage: 'Add dashboards',
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
                        defaultMessage: 'Add a dashboard',
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
        <DashboardsTable
          entityId={definition?.stream.name}
          dashboards={filteredDashboards}
          loading={dashboardsFetch.loading}
          selectedDashboards={selectedDashboards}
          setSelectedDashboards={canLinkAssets ? setSelectedDashboards : undefined}
          dataTestSubj="streamsAppStreamDetailDashboardsTable"
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
              dashboardsFetch.refresh();
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
