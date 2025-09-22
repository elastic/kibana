/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiPageHeader,
  useEuiTheme,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import type { ReactNode } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import { calculateDataQuality } from '../../../util/calculate_data_quality';
import { useStreamDocCountsFetch } from '../../../hooks/use_streams_doc_counts_fetch';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useKibana } from '../../../hooks/use_kibana';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { ClassicStreamBadge, DiscoverBadgeButton, LifecycleBadge } from '../../stream_badges';
import { FeatureFlagStreamsContentPackUIEnabled } from '../../../../common/feature_flags';
import { ExportContentPackFlyout } from '../content/export_flyout';
import { ImportContentPackFlyout } from '../content/import_flyout';
import { GroupStreamControls } from './group_stream_controls';

export type ManagementTabs = Record<
  string,
  {
    content: JSX.Element;
    label: ReactNode;
  }
>;

export function Wrapper({
  tabs,
  streamId,
  tab,
}: {
  tabs: ManagementTabs;
  streamId: string;
  tab: string;
}) {
  const router = useStreamsAppRouter();
  const { definition, refresh: refreshDefinition } = useStreamDetail();
  const [isExportFlyoutOpen, setIsExportFlyoutOpen] = useState(false);
  const [isImportFlyoutOpen, setIsImportFlyoutOpen] = useState(false);
  const {
    core: { featureFlags },
  } = useKibana();
  const {
    features: { groupStreams },
  } = useStreamsPrivileges();

  const renderContentPackItems = featureFlags.getBooleanValue(
    FeatureFlagStreamsContentPackUIEnabled,
    false
  );

  const tabMap = Object.fromEntries(
    Object.entries(tabs).map(([tabName, currentTab]) => {
      return [
        tabName,
        {
          href: router.link('/{key}/management/{tab}', {
            path: { key: streamId, tab: tabName },
          }),
          label: currentTab.label,
          content: currentTab.content,
        },
      ];
    })
  );

  const { getStreamDocCounts } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: false,
  });
  const docCountsFetch = getStreamDocCounts(streamId);

  const countResult = useAsync(() => docCountsFetch.docCount, [docCountsFetch]);
  const failedDocsResult = useAsync(() => docCountsFetch.failedDocCount, [docCountsFetch]);
  const degradedDocsResult = useAsync(() => docCountsFetch.degradedDocCount, [docCountsFetch]);

  const docCount = countResult?.value ? Number(countResult.value?.values?.[0]?.[0]) : 0;
  const degradedDocCount = degradedDocsResult?.value
    ? Number(degradedDocsResult.value?.values?.[0]?.[0])
    : 0;
  const failedDocCount = failedDocsResult?.value
    ? Number(failedDocsResult.value?.values?.[0]?.[0])
    : 0;

  const quality = calculateDataQuality({
    totalDocs: docCount,
    degradedDocs: degradedDocCount,
    failedDocs: failedDocCount,
  });
  const isQualityLoading =
    countResult?.loading || failedDocsResult?.loading || degradedDocsResult.loading;

  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiPageHeader
        paddingSize="l"
        bottomBorder="extended"
        breadcrumbs={[
          {
            href: router.link('/'),
            text: (
              <EuiButtonEmpty iconType="arrowLeft" size="s" flush="left">
                {i18n.translate('xpack.streams.entityDetailViewWithoutParams.breadcrumb', {
                  defaultMessage: 'Streams',
                })}
              </EuiButtonEmpty>
            ),
          },
        ]}
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
        pageTitle={
          <EuiFlexGroup gutterSize="s" alignItems="baseline">
            {i18n.translate('xpack.streams.entityDetailViewWithoutParams.manageStreamTitle', {
              defaultMessage: 'Manage stream {streamId}',
              values: { streamId },
            })}
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={true}>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  {Streams.ingest.all.GetResponse.is(definition) && (
                    <DiscoverBadgeButton definition={definition} />
                  )}
                  {Streams.ClassicStream.GetResponse.is(definition) && <ClassicStreamBadge />}
                  {Streams.ingest.all.GetResponse.is(definition) && (
                    <LifecycleBadge lifecycle={definition.effective_lifecycle} />
                  )}
                  <DatasetQualityIndicator
                    quality={quality}
                    isLoading={isQualityLoading}
                    verbose={true}
                  />
                </EuiFlexGroup>
              </EuiFlexItem>

              {renderContentPackItems && Streams.WiredStream.GetResponse.is(definition) && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiButton
                      size="s"
                      iconType="importAction"
                      onClick={() => setIsImportFlyoutOpen(true)}
                      data-test-subj="streamsAppImportButton"
                    >
                      {i18n.translate('xpack.streams.importButton', {
                        defaultMessage: 'Import',
                      })}
                    </EuiButton>
                    <EuiButton
                      size="s"
                      iconType="exportAction"
                      onClick={() => setIsExportFlyoutOpen(true)}
                      data-test-subj="streamsAppExportButton"
                    >
                      {i18n.translate('xpack.streams.exportButton', {
                        defaultMessage: 'Export',
                      })}
                    </EuiButton>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}

              {groupStreams?.enabled && Streams.GroupStream.GetResponse.is(definition) && (
                <GroupStreamControls />
              )}
            </EuiFlexGroup>
          </EuiFlexGroup>
        }
        tabs={Object.entries(tabMap).map(([tabKey, { label, href }]) => ({
          label,
          href,
          isSelected: tab === tabKey,
        }))}
      />
      <StreamsAppPageTemplate.Body>{tabs[tab]?.content}</StreamsAppPageTemplate.Body>

      {renderContentPackItems && Streams.WiredStream.GetResponse.is(definition) && (
        <>
          {isExportFlyoutOpen && (
            <ExportContentPackFlyout
              onClose={() => setIsExportFlyoutOpen(false)}
              definition={definition}
              onExport={() => {
                setIsExportFlyoutOpen(false);
              }}
            />
          )}

          {isImportFlyoutOpen && (
            <ImportContentPackFlyout
              onClose={() => setIsImportFlyoutOpen(false)}
              definition={definition}
              onImport={() => {
                setIsImportFlyoutOpen(false);
                refreshDefinition();
              }}
            />
          )}
        </>
      )}
    </>
  );
}
