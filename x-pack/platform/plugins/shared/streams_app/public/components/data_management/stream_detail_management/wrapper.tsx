/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiButton, EuiFlexGroup, EuiPageHeader, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import type { ReactNode } from 'react';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { ClassicStreamBadge, DiscoverBadgeButton, LifecycleBadge } from '../../stream_badges';
import { ImportFlyout } from './content/import_flyout';
import { ExportFlyout } from './content/export_flyout';

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
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <DiscoverBadgeButton definition={definition} />
              {Streams.UnwiredStream.GetResponse.is(definition) && <ClassicStreamBadge />}
              <LifecycleBadge lifecycle={definition.effective_lifecycle} />

              {Streams.WiredStream.GetResponse.is(definition) && (
                <>
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
                </>
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

      {Streams.WiredStream.GetResponse.is(definition) && (
        <>
          {isExportFlyoutOpen && (
            <ExportFlyout onClose={() => setIsExportFlyoutOpen(false)} definition={definition} />
          )}

          {isImportFlyoutOpen && (
            <ImportFlyout
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
