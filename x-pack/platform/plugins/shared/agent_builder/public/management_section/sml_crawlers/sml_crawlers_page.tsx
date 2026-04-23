/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';

interface CrawlerItem {
  type_id: string;
  fetch_frequency: string;
}

interface SmlCrawlersPageProps {
  http: HttpSetup;
  notifications: NotificationsStart;
}

export const SmlCrawlersPage: React.FC<SmlCrawlersPageProps> = ({ http, notifications }) => {
  const [crawlers, setCrawlers] = useState<CrawlerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [editingInterval, setEditingInterval] = useState<Record<string, string>>({});

  const fetchCrawlers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await http.get<{ crawlers: CrawlerItem[] }>(
        '/internal/agent_builder/sml/crawlers'
      );
      setCrawlers(response.crawlers);
    } catch (e) {
      notifications.toasts.addError(e as Error, { title: 'Failed to load SML crawlers' });
    } finally {
      setLoading(false);
    }
  }, [http, notifications]);

  useEffect(() => {
    fetchCrawlers();
  }, [fetchCrawlers]);

  const apiPath = (typeId: string, action: string) =>
    `/internal/agent_builder/sml/crawlers/${encodeURIComponent(typeId)}/${action}`;

  const handleActivate = async (typeId: string) => {
    setBusyAction(`activate:${typeId}`);
    try {
      await http.post(apiPath(typeId, '_activate'));
      notifications.toasts.addSuccess(`Crawler '${typeId}' activated with your credentials`);
    } catch (e) {
      notifications.toasts.addError(e as Error, {
        title: `Failed to activate crawler '${typeId}'`,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunNow = async (typeId: string) => {
    setBusyAction(`run:${typeId}`);
    try {
      await http.post(apiPath(typeId, '_run'));
      notifications.toasts.addSuccess(`Crawler '${typeId}' triggered`);
    } catch (e) {
      notifications.toasts.addError(e as Error, {
        title: `Failed to trigger crawler '${typeId}'`,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveInterval = async (typeId: string) => {
    const newInterval = editingInterval[typeId];
    if (!newInterval) return;

    setBusyAction(`schedule:${typeId}`);
    try {
      await http.post(apiPath(typeId, '_schedule'), {
        body: JSON.stringify({ interval: newInterval }),
      });
      setCrawlers((prev) =>
        prev.map((c) => (c.type_id === typeId ? { ...c, fetch_frequency: newInterval } : c))
      );
      setEditingInterval((prev) => {
        const next = { ...prev };
        delete next[typeId];
        return next;
      });
      notifications.toasts.addSuccess(
        `Crawler '${typeId}' schedule updated to '${newInterval}'`
      );
    } catch (e) {
      notifications.toasts.addError(e as Error, {
        title: `Failed to update schedule for '${typeId}'`,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleClean = async (typeId: string) => {
    setBusyAction(`clean:${typeId}`);
    try {
      const result = await http.post<{
        state_deleted: number;
        data_deleted: number;
      }>(apiPath(typeId, '_clean'));
      notifications.toasts.addSuccess(
        `Crawler '${typeId}' cleaned: ${result.state_deleted} state + ${result.data_deleted} data entries removed. Run the crawler to re-index.`
      );
    } catch (e) {
      notifications.toasts.addError(e as Error, {
        title: `Failed to clean crawler '${typeId}'`,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const isBusy = busyAction !== null;

  const columns: Array<EuiBasicTableColumn<CrawlerItem>> = [
    {
      field: 'type_id',
      name: 'Type',
      sortable: true,
      width: '30%',
    },
    {
      field: 'fetch_frequency',
      name: 'Crawl interval',
      width: '35%',
      render: (_value: string, item: CrawlerItem) => {
        const isEditing = item.type_id in editingInterval;
        const currentValue = isEditing ? editingInterval[item.type_id] : item.fetch_frequency;

        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false} style={{ width: 100 }}>
              <EuiFieldText
                compressed
                value={currentValue}
                onChange={(e) =>
                  setEditingInterval((prev) => ({ ...prev, [item.type_id]: e.target.value }))
                }
                disabled={isBusy}
              />
            </EuiFlexItem>
            {isEditing && editingInterval[item.type_id] !== item.fetch_frequency && (
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="check"
                  aria-label="Save interval"
                  color="success"
                  onClick={() => handleSaveInterval(item.type_id)}
                  isDisabled={isBusy}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
    {
      name: 'Actions',
      width: '35%',
      actions: [
        {
          name: 'Activate',
          description: 'Grant this crawler your index access privileges',
          type: 'icon',
          icon: 'play',
          onClick: (item: CrawlerItem) => handleActivate(item.type_id),
          enabled: () => !isBusy,
        },
        {
          name: 'Run now',
          description: 'Trigger this crawler immediately',
          type: 'icon',
          icon: 'refresh',
          onClick: (item: CrawlerItem) => handleRunNow(item.type_id),
          enabled: () => !isBusy,
        },
        {
          name: 'Clean',
          description: 'Delete all crawler state and indexed data for this type, forcing a full re-crawl',
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          onClick: (item: CrawlerItem) => handleClean(item.type_id),
          enabled: () => !isBusy,
        },
      ],
    },
  ];

  return (
    <>
      <EuiPageHeader pageTitle="SML Crawlers" />
      <EuiSpacer size="l" />
      <EuiPageSection>
        <EuiBasicTable<CrawlerItem>
          items={crawlers}
          columns={columns}
          loading={loading}
          noItemsMessage={loading ? 'Loading crawlers...' : 'No SML crawlers registered'}
        />
      </EuiPageSection>
    </>
  );
};
