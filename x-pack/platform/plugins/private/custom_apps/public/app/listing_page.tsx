/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiInMemoryTable,
  EuiLink,
  EuiPageTemplate,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { formatDate } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { CustomAppListItem } from '../../common/app_definition';
import type { CustomAppClient } from './custom_app_client';
import { CUSTOM_APP_TEMPLATES } from '../templates';
import { PLUGIN_NAME } from '../../common/constants';

export interface ListingPageProps {
  core: CoreStart;
  client: CustomAppClient;
  onOpen: (id: string) => void;
  onAppsChanged: () => void;
}

export function ListingPage({ core, client, onOpen, onAppsChanged }: ListingPageProps) {
  const [items, setItems] = useState<CustomAppListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setItems(await client.list());
    } catch (error) {
      core.notifications.toasts.addDanger({
        title: 'Could not load custom apps',
        text: error.body?.message ?? error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [client, core]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // The listing is the root of this app, so it owns the first breadcrumb; an
  // app page appends its own title to it.
  useEffect(() => {
    core.chrome.setBreadcrumbs([{ text: PLUGIN_NAME }]);
  }, [core]);

  const createFrom = useCallback(
    async (templateId: string) => {
      const template = CUSTOM_APP_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;
      setIsCreateOpen(false);
      try {
        const created = await client.create(template.build());
        onAppsChanged();
        onOpen(created.id);
      } catch (error) {
        core.notifications.toasts.addDanger({
          title: 'Could not create app',
          text: error.body?.message ?? error.message,
        });
      }
    },
    [client, core, onOpen, onAppsChanged]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await client.delete(id);
        onAppsChanged();
        await refresh();
      } catch (error) {
        core.notifications.toasts.addDanger({
          title: 'Could not delete app',
          text: error.body?.message ?? error.message,
        });
      }
    },
    [client, core, refresh, onAppsChanged]
  );

  return (
    <EuiPageTemplate grow offset={0}>
      <EuiPageTemplate.Header
        pageTitle="Custom apps"
        description="Applications defined entirely as declarative JSON, rendered with EUI."
        rightSideItems={[
          <EuiPopover
            key="create"
            aria-label="Choose a template for the new custom app"
            isOpen={isCreateOpen}
            closePopover={() => setIsCreateOpen(false)}
            panelPaddingSize="none"
            button={
              <EuiButton fill iconType="plusInCircle" onClick={() => setIsCreateOpen((v) => !v)}>
                Create app
              </EuiButton>
            }
          >
            <EuiContextMenuPanel
              items={CUSTOM_APP_TEMPLATES.map((template) => (
                <EuiContextMenuItem key={template.id} onClick={() => createFrom(template.id)}>
                  <strong>{template.name}</strong>
                  <EuiText size="xs" color="subdued">
                    {template.description}
                  </EuiText>
                </EuiContextMenuItem>
              ))}
            />
          </EuiPopover>,
        ]}
      />

      <EuiPageTemplate.Section>
        {!isLoading && items.length === 0 ? (
          <EuiPageTemplate.EmptyPrompt
            title={<h2>No custom apps yet</h2>}
            body={<p>Create one from a template to see what the catalog can do.</p>}
          />
        ) : (
          <>
            <EuiSpacer size="s" />
            <EuiInMemoryTable
              loading={isLoading}
              items={items}
              tableCaption="Custom apps in this space"
              // Most recently touched first: the app someone is working on is
              // the one they are most likely to be coming back to.
              sorting={{ sort: { field: 'updatedAt', direction: 'desc' } }}
              search={items.length > 5 ? { box: { incremental: true } } : undefined}
              pagination={items.length > 20 ? { initialPageSize: 20 } : undefined}
              columns={[
                {
                  field: 'title',
                  name: 'Title',
                  sortable: true,
                  render: (title: string, item: CustomAppListItem) => (
                    <EuiLink onClick={() => onOpen(item.id)}>{title}</EuiLink>
                  ),
                },
                { field: 'description', name: 'Description' },
                {
                  field: 'updatedAt',
                  name: 'Last updated',
                  dataType: 'date',
                  sortable: true,
                  width: '200px',
                  render: (value: string) => (value ? formatDate(value, 'longDateTime') : '—'),
                },
                {
                  name: 'Actions',
                  actions: [
                    {
                      name: 'Delete',
                      description: 'Delete this custom app',
                      icon: 'trash',
                      color: 'danger',
                      type: 'icon',
                      onClick: (item: CustomAppListItem) => remove(item.id),
                    },
                  ],
                },
              ]}
            />
          </>
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
