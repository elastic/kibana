/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import type { NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { Streams } from '@kbn/streams-schema';
import React, { useEffect, useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { DashboardsTab } from './dashboards_tab';
import { OverviewTab } from './overview_tab';
import type { GroupStreamFormData } from './types';
import { RulesTab } from './rules_tab';

export type GroupStreamModificationFlyoutTabId = 'overview' | 'dashboards' | 'rules';
interface GroupStreamModificationFlyoutTab {
  id: GroupStreamModificationFlyoutTabId;
  name: string;
  content: React.JSX.Element;
}

export function GroupStreamModificationFlyout({
  client,
  notifications,
  streamsList,
  refresh,
  existingStream,
  existingDashboards,
  existingRules,
  startingTab = 'overview',
}: {
  startingTab?: GroupStreamModificationFlyoutTabId;
  client: StreamsRepositoryClient;
  notifications: NotificationsStart;
  streamsList?: Array<{ stream: Streams.all.Definition }>;
  refresh: () => void;
  existingStream?: Streams.GroupStream.Definition;
  existingDashboards?: string[];
  existingRules?: string[];
}) {
  const {
    core: { http },
    dependencies: {
      start: { dashboard: dashboardStart },
    },
  } = useKibana();
  const { signal } = useAbortController();

  const [formData, setFormData] = React.useState<GroupStreamFormData>({
    name: existingStream?.name ?? '',
    description: existingStream?.description ?? '',
    metadata: existingStream?.group.metadata ?? {},
    tags: existingStream?.group.tags.map((tag) => ({ label: tag })) ?? [],
    members:
      existingStream?.group.members.map((member) => ({
        label: member,
      })) ?? [],
    dashboards: [],
    rules: [],
  });

  useEffect(() => {
    if (!existingDashboards) {
      return;
    }

    const enrichDashboards = async () => {
      const findDashboardsService = await dashboardStart.findDashboardsService();
      const searchResults = await findDashboardsService.findByIds(existingDashboards);
      setFormData((prevData) => ({
        ...prevData,
        dashboards: searchResults.map((hit) => ({
          id: hit.id,
          title: hit.status === 'success' ? hit.attributes.title : hit.id,
        })),
      }));
    };

    enrichDashboards();
  }, [existingDashboards, dashboardStart]);

  useEffect(() => {
    if (!existingRules) {
      return;
    }

    const enrichRules = async () => {
      const result: { data: Array<{ id: string; name: string }> } = await http.get(
        '/api/alerting/rules/_find',
        {
          query: {
            page: 1,
            per_page: 10000,
            search: '',
            search_fields: 'name',
          },
        }
      );
      const rulesMap = result.data.reduce<Record<string, string>>((acc, rule) => {
        acc[rule.id] = rule.name;
        return acc;
      }, {});

      setFormData((prevData) => ({
        ...prevData,
        rules: existingRules
          .map((ruleId) => (rulesMap[ruleId] ? { id: ruleId, name: rulesMap[ruleId] } : undefined))
          .filter(Boolean) as Array<{ id: string; name: string }>,
      }));
    };

    enrichRules();
  }, [existingRules, http]);

  async function modifyGroupStream() {
    let streamBaseData: any = {};
    if (existingStream) {
      streamBaseData = await client.fetch('GET /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: formData.name },
        },
        signal,
      });
    }

    client
      .fetch('PUT /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: formData.name },
          body: {
            slos: [],
            queries: [],
            ...streamBaseData, // I can remove this once I do SLOs since queries don't make sense for Group streams
            dashboards: formData.dashboards.map((dashboard) => dashboard.id),
            rules: formData.rules.map((rule) => rule.id),
            stream: {
              description: formData.description,
              group: {
                metadata: formData.metadata,
                tags: formData.tags.map((option) => option.label),
                members: formData.members.map((opt) => opt.label),
              },
            },
          },
        },
        signal,
      })
      .then(() => {
        const successTitle = existingStream
          ? i18n.translate('xpack.streams.groupStreamModificationFlyout.updatedSuccessToast', {
              defaultMessage: 'Group stream updated successfully',
            })
          : i18n.translate('xpack.streams.groupStreamModificationFlyout.createdSuccessToast', {
              defaultMessage: 'Group stream created successfully',
            });
        notifications.toasts.addSuccess({ title: successTitle });
        refresh();
      })
      .catch((error) => {
        notifications.toasts.addError(error, {
          title: existingStream
            ? i18n.translate('xpack.streams.groupStreamModificationFlyout.updateFailedToast', {
                defaultMessage: 'Failed to update Group stream',
              })
            : i18n.translate('xpack.streams.groupStreamModificationFlyout.createFailedToast', {
                defaultMessage: 'Failed to create Group stream',
              }),
        });
      });
  }

  const availableStreams =
    streamsList?.map((stream) => ({
      label: stream.stream.name,
    })) ?? [];

  const tabs: GroupStreamModificationFlyoutTab[] = [
    {
      id: 'overview',
      name: i18n.translate('xpack.streams.groupStreamModificationFlyout.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
      content: (
        <OverviewTab
          existingStream={!!existingStream}
          availableStreams={availableStreams}
          formData={formData}
          setFormData={setFormData}
        />
      ),
    },
    // Maybe these can use a single generic component?
    {
      id: 'dashboards',
      name: i18n.translate('xpack.streams.groupStreamModificationFlyout.dashboardsTabLabel', {
        defaultMessage: 'Dashboards',
      }),
      content: <DashboardsTab formData={formData} setFormData={setFormData} />,
    },
    {
      id: 'rules',
      name: i18n.translate('xpack.streams.groupStreamModificationFlyout.rulesTabLabel', {
        defaultMessage: 'Rules',
      }),
      content: <RulesTab formData={formData} setFormData={setFormData} />,
    },
  ];

  const [selectedTabId, setSelectedTabId] = useState(startingTab);
  const onSelectedTabChanged = (id: GroupStreamModificationFlyoutTabId) => {
    setSelectedTabId(id);
  };

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {existingStream
            ? i18n.translate('xpack.streams.groupStreamModificationFlyout.editTitle', {
                defaultMessage: 'Edit {name}',
                values: { name: formData.name },
              })
            : i18n.translate('xpack.streams.groupStreamModificationFlyout.createTitle', {
                defaultMessage: 'Create Group stream',
              })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiTabs>
          {tabs.map((tab, index) => (
            <EuiTab
              key={index}
              onClick={() => onSelectedTabChanged(tab.id)}
              isSelected={tab.id === selectedTabId}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="m" />
        {tabs.find((obj) => obj.id === selectedTabId)?.content}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={modifyGroupStream} fill>
          {existingStream
            ? i18n.translate('xpack.streams.groupStreamModificationFlyout.updateButtonLabel', {
                defaultMessage: 'Update',
              })
            : i18n.translate('xpack.streams.groupStreamModificationFlyout.createButtonLabel', {
                defaultMessage: 'Create',
              })}
        </EuiButton>
      </EuiModalFooter>
    </>
  );
}
