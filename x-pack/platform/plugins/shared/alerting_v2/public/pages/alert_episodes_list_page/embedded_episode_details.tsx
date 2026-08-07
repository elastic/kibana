/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { Container } from 'inversify';
import { i18n } from '@kbn/i18n';
import { Context } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { KibanaContextProvider, useKibana } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import { untilPluginStartServicesReady } from '../../kibana_services';
import { BreadcrumbProvider } from '../../application/breadcrumb_context';
import type { AlertEpisodesKibanaServices } from '../../episodes_kibana_services';
import { RequireAlertingPrivilege } from '../../components/require_alerting_privilege';
import { EpisodeDetailsPage } from '../episode_details_page/episode_details_page';

export interface EmbeddedEpisodeDetailsProps {
  /** Absolute href back to Observability Inbox. */
  episodesListHref: string;
  getEpisodeDetailsHref: (episodeId: string) => string;
  getRuleDetailsHref: (ruleId: string) => string;
}

/**
 * Embeddable Alerting v2 episode details for Observability Inbox.
 * Stays under `/app/observability/alerts/inbox/:episodeId`.
 */
export function EmbeddedEpisodeDetails({
  episodesListHref,
  getEpisodeDetailsHref,
  getRuleDetailsHref,
}: EmbeddedEpisodeDetailsProps) {
  const parentServices = useKibana().services;
  const [container, setContainer] = useState<Container | null>(null);
  const [extraPlugins, setExtraPlugins] = useState<{
    unifiedDocViewer: UnifiedDocViewerStart;
    share: SharePluginStart;
    fieldFormats: FieldFormatsStart;
    charts: ChartsPluginStart;
    spaces: SpacesPluginStart;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    untilPluginStartServicesReady().then((services) => {
      if (cancelled) {
        return;
      }
      const { container: di } = services;
      setContainer(di);
      setExtraPlugins({
        unifiedDocViewer: di.get(PluginStart('unifiedDocViewer')) as UnifiedDocViewerStart,
        share: di.get(PluginStart('share')) as SharePluginStart,
        fieldFormats: di.get(PluginStart('fieldFormats')) as FieldFormatsStart,
        charts: di.get(PluginStart('charts')) as ChartsPluginStart,
        spaces: di.get(PluginStart('spaces')) as SpacesPluginStart,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const episodeServices = useMemo((): AlertEpisodesKibanaServices | null => {
    if (!extraPlugins || !parentServices.http) {
      return null;
    }

    return {
      ...(parentServices as AlertEpisodesKibanaServices),
      share: extraPlugins.share,
      fieldFormats: extraPlugins.fieldFormats,
      charts: extraPlugins.charts,
      unifiedDocViewer: extraPlugins.unifiedDocViewer,
      spaces: extraPlugins.spaces,
      storage: parentServices.storage ?? new Storage(localStorage),
      toastNotifications:
        parentServices.toastNotifications ?? parentServices.notifications.toasts,
      userProfile: parentServices.userProfile,
    };
  }, [extraPlugins, parentServices]);

  if (!container || !episodeServices) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" data-test-subj="alertingV2EmbeddedEpisodeDetailsLoading" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <KibanaContextProvider services={episodeServices}>
      <Context.Provider value={container}>
        <BreadcrumbProvider setBreadcrumbs={() => {}}>
          <RequireAlertingPrivilege
            features={['alerts']}
            pageName={i18n.translate('xpack.alertingV2.embeddedEpisodeDetails.pageName', {
              defaultMessage: 'Inbox',
            })}
          >
            <EpisodeDetailsPage
              embedded
              episodesListHref={episodesListHref}
              getEpisodeDetailsHref={getEpisodeDetailsHref}
              getRuleDetailsHref={getRuleDetailsHref}
            />
          </RequireAlertingPrivilege>
        </BreadcrumbProvider>
      </Context.Provider>
    </KibanaContextProvider>
  );
}
