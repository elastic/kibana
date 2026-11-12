/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiDescriptionList, EuiLoadingSpinner, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ContextEngineConnectorFeatureId } from '@kbn/actions-plugin/common';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useQuery } from '@kbn/react-query';
import type {
  ConnectorFlyoutTab,
  ConnectorFlyoutTabChanges,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { LearnSettings } from '../common/types';
import { messageOf, type ConnectorMemoryApi } from './api';
import { SettingsForm } from './settings_form';

/** What a connector is set to learn, in the words the form uses. */
export const learnLabel = ({ learn, reach }: Pick<LearnSettings, 'learn' | 'reach'>): string => {
  if (learn === 'off') {
    return i18n.translate('xpack.connectorMemory.learns.off', { defaultMessage: 'Nothing' });
  }
  return reach === 'siblings'
    ? i18n.translate('xpack.connectorMemory.learns.siblings', {
        defaultMessage: 'Direct hits plus neighbors',
      })
    : reach === 'area'
    ? i18n.translate('xpack.connectorMemory.learns.area', {
        defaultMessage: 'Direct hits plus area',
      })
    : i18n.translate('xpack.connectorMemory.learns.direct', { defaultMessage: 'Only direct hits' });
};

/** `names`, `excerpt` and `llm` are what a cached file can be: a name from a listing, the start of its text, a model summary. */
const describeKinds = (byKind: Partial<Record<string, number>>): string =>
  [
    byKind.names &&
      i18n.translate('xpack.connectorMemory.kinds.names', {
        defaultMessage: '{count, number} names only',
        values: { count: byKind.names },
      }),
    byKind.excerpt &&
      i18n.translate('xpack.connectorMemory.kinds.excerpt', {
        defaultMessage: '{count, number} excerpts',
        values: { count: byKind.excerpt },
      }),
    byKind.llm &&
      i18n.translate('xpack.connectorMemory.kinds.llm', {
        defaultMessage: '{count, number} summaries',
        values: { count: byKind.llm },
      }),
  ]
    .filter(Boolean)
    .join(', ');

const formatTime = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso).toLocaleString()
    : i18n.translate('xpack.connectorMemory.panel.never', { defaultMessage: 'Never' });

/**
 * What one connector's memory holds and how it is set to learn. The form saves with the flyout's own Save, so it reports
 * its unsaved changes through `onChanges`.
 */
export const ContextPanel = ({
  api,
  connectorId,
  isReadOnly,
  onChanges,
}: {
  api: ConnectorMemoryApi;
  connectorId: string;
  isReadOnly: boolean;
  onChanges?: (changes: ConnectorFlyoutTabChanges | null) => void;
}) => {
  const { data, error, isLoading } = useQuery({
    queryKey: ['connectorMemory', 'status', connectorId],
    queryFn: () => api.getStatus(connectorId),
  });

  if (isLoading) {
    return <EuiLoadingSpinner size="l" data-test-subj="connectorMemoryPanelLoading" />;
  }
  if (error || !data) {
    return (
      <KbnDangerCallout
        data-test-subj="connectorMemoryPanelError"
        title={i18n.translate('xpack.connectorMemory.panel.errorTitle', {
          defaultMessage: 'The context for this connector could not be loaded',
        })}
      >
        {messageOf(error)}
      </KbnDangerCallout>
    );
  }

  const { documents, settings, schedule } = data;
  const kinds = describeKinds(documents.byKind);

  return (
    <div data-test-subj="connectorMemoryPanel">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.connectorMemory.panel.settingsTitle', {
            defaultMessage: 'Context memory',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <SettingsForm
        // Start again from what is saved whenever the settings change.
        key={JSON.stringify([settings.effective, schedule?.crawl])}
        api={api}
        connectorId={connectorId}
        contentSource={data.contentSource}
        settings={settings.effective}
        customized={settings.customized}
        crawlEnabled={data.crawlEnabled}
        schedule={schedule}
        isReadOnly={isReadOnly}
        onChanges={onChanges}
      />
      <EuiSpacer size="xl" />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.connectorMemory.panel.title', {
            defaultMessage: 'What agents have learned through this connector',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="column"
        compressed
        listItems={[
          {
            title: i18n.translate('xpack.connectorMemory.panel.cached', {
              defaultMessage: 'Cached',
            }),
            description: i18n.translate('xpack.connectorMemory.panel.cachedValue', {
              defaultMessage: '{total, number} files ({mine, number} visible to you){kinds}',
              values: {
                total: documents.total,
                mine: documents.visibleToYou,
                kinds: kinds ? ` — ${kinds}` : '',
              },
            }),
          },
          {
            title: i18n.translate('xpack.connectorMemory.panel.lastActivity', {
              defaultMessage: 'Last activity',
            }),
            description: formatTime(data.newestAt),
          },
        ]}
      />
      {data.permissionScope === 'per_user' && (
        <>
          <EuiSpacer size="s" />
          <p data-test-subj="connectorMemoryPerUserNote">
            {i18n.translate('xpack.connectorMemory.panel.perUserNote', {
              defaultMessage:
                'This connector authorizes each user separately, so what is cached is visible to the users who proved they can open each file.',
            })}
          </p>
        </>
      )}
    </div>
  );
};

/** The API client needs core's HTTP, which is only available once the app has started. */
const ContextTabContent = ({
  getApi,
  ...props
}: {
  getApi: () => Promise<ConnectorMemoryApi>;
  connectorId: string;
  isReadOnly: boolean;
  onChanges: (changes: ConnectorFlyoutTabChanges | null) => void;
}) => {
  const [api, setApi] = useState<ConnectorMemoryApi | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getApi().then((resolved) => !cancelled && setApi(resolved));
    return () => {
      cancelled = true;
    };
  }, [getApi]);
  return api ? <ContextPanel api={api} {...props} /> : null;
};

/** The Context tab of the Edit connector flyout, for connector types that declare Context Engine support. */
export const createContextTab = (
  getApi: () => Promise<ConnectorMemoryApi>
): ConnectorFlyoutTab => ({
  id: 'context',
  title: i18n.translate('xpack.connectorMemory.contextTab.title', { defaultMessage: 'Context' }),
  isSupported: ({ supportedFeatureIds }) =>
    supportedFeatureIds.includes(ContextEngineConnectorFeatureId),
  render: ({ connector, isReadOnly, onChanges }) => (
    <ContextTabContent
      getApi={getApi}
      connectorId={connector.id}
      isReadOnly={isReadOnly}
      onChanges={onChanges}
    />
  ),
});
