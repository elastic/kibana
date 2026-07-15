/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useWatches, useCreateWatch } from '../../hooks/use_watches_api';
import { CoverageStrip } from './components/coverage_strip';
import { WatchCardGrid } from './components/watch_card_grid';
import { InboxWatchesNav } from './components/inbox_watches_nav';
import * as i18n from './translations';

export const WatchesPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const { services } = useKibana();
  const { data, isLoading, error, refetch } = useWatches();
  const createWatch = useCreateWatch();

  const onViewInvestigations = useCallback(
    (watchId: string) => {
      history.push(`/investigations?watch=${encodeURIComponent(watchId)}`);
    },
    [history]
  );

  const onOpenWatchSettings = useCallback(
    (watchId: string) => {
      history.push(`/watches/${watchId}`);
    },
    [history]
  );

  const onNewWatch = useCallback(() => {
    createWatch.mutate(
      {
        name: i18n.NEW_CUSTOM_WATCH_NAME,
        description: i18n.NEW_CUSTOM_WATCH_DESCRIPTION,
      },
      {
        onSuccess: (result) => {
          services.notifications?.toasts.addSuccess(i18n.CUSTOM_WATCH_CREATED);
          history.push(`/watches/${result.watch.id}`);
        },
        onError: () => {
          services.notifications?.toasts.addError(new Error(i18n.CUSTOM_WATCH_CREATE_FAILED), {
            title: i18n.CUSTOM_WATCH_CREATE_FAILED,
          });
        },
      }
    );
  }, [createWatch, history, services.notifications]);

  const sectionCount = useMemo(() => {
    if (!data) return '';
    const active = data.watches.filter((w) => w.enabled && !w.draft).length;
    const drafts = data.watches.filter((w) => w.draft).length;
    const paused = data.watches.filter((w) => !w.enabled && !w.draft).length;
    return i18n.watchesSectionCount(active, drafts, paused);
  }, [data]);

  return (
    <EuiPageSection paddingSize="l" css={{ paddingTop: euiTheme.size.l }}>
      <InboxWatchesNav active="watches" />
      <EuiSpacer size="m" />
      <EuiTitle size="l">
        <h1>{i18n.PAGE_TITLE}</h1>
      </EuiTitle>
      <EuiText color="subdued" size="s">
        <p>{i18n.PAGE_SUBTITLE}</p>
      </EuiText>
      <EuiSpacer size="l" />

      {isLoading && !data ? (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}

      {error ? (
        <EuiEmptyPrompt
          iconType="error"
          color="danger"
          title={<h2>{i18n.LOAD_ERROR_TITLE}</h2>}
          body={<p>{i18n.LOAD_ERROR_BODY}</p>}
          actions={
            <EuiButton onClick={() => refetch()} fill>
              {i18n.RETRY}
            </EuiButton>
          }
        />
      ) : null}

      {data ? (
        <>
          <CoverageStrip watches={data.watches} onSelectWatch={onViewInvestigations} />
          <EuiSpacer size="l" />
          <EuiFlexGroup alignItems="baseline" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>{i18n.WATCHES_SECTION_TITLE}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {sectionCount}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <WatchCardGrid
            watches={data.watches}
            onViewInvestigations={onViewInvestigations}
            onOpenWatchSettings={onOpenWatchSettings}
            onNewWatch={onNewWatch}
          />
        </>
      ) : null}
    </EuiPageSection>
  );
};
