/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSearchBar } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import type { Streams } from '@kbn/streams-schema';
import React, { useMemo, useState } from 'react';
import { useDashboardsApi } from '../../hooks/use_dashboards_api';
import { useDashboardsFetch } from '../../hooks/use_dashboards_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { AddAttachmentFlyout } from './add_attachment_flyout';
import { AttachmentsTable } from './attachment_table';

export function StreamDetailAttachments({
  definition,
}: {
  definition: Streams.ingest.all.GetResponse;
}) {
  const [query, setQuery] = useState('');

  const [isAddDashboardFlyoutOpen, setIsAddDashboardFlyoutOpen] = useState(false);

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

  const [selectedDashboards, setSelectedDashboards] = useState<Attachment[]>([]);

  const {
    core: {
      application: {
        capabilities: {
          streams: { [STREAMS_UI_PRIVILEGES.manage]: canLinkAttachments },
        },
      },
    },
  } = useKibana();

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
              {i18n.translate(
                'xpack.streams.streamDetailAttachmentView.removeSelectedButtonLabel',
                {
                  defaultMessage: 'Unlink selected',
                }
              )}
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
          <EuiButton
            data-test-subj="streamsAppStreamDetailAddDashboardButton"
            iconType="plusInCircle"
            disabled={!canLinkAttachments}
            onClick={() => {
              setIsAddDashboardFlyoutOpen(true);
            }}
          >
            {i18n.translate('xpack.streams.streamDetailAttachmentView.addAnAttachmentButtonLabel', {
              defaultMessage: 'Add an attachment',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <AttachmentsTable
          entityId={definition?.stream.name}
          attachments={filteredDashboards}
          loading={dashboardsFetch.loading}
          selectedAttachments={selectedDashboards}
          setSelectedAttachments={canLinkAttachments ? setSelectedDashboards : undefined}
          dataTestSubj="streamsAppStreamDetailDashboardsTable"
        />
        {definition && isAddDashboardFlyoutOpen ? (
          <AddAttachmentFlyout
            linkedAttachments={linkedDashboards}
            entityId={definition.stream.name}
            onAddAttachments={async (dashboards) => {
              await addDashboards(dashboards);
              dashboardsFetch.refresh();
              setIsAddDashboardFlyoutOpen(false);
            }}
            onClose={() => {
              setIsAddDashboardFlyoutOpen(false);
            }}
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
