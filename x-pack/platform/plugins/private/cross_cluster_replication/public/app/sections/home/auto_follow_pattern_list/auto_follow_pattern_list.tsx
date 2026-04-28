/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import type { History } from 'history';
import type { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiText, EuiSpacer, EuiPageTemplate } from '@elastic/eui';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { extractQueryParams, PageError, PageLoading } from '../../../../shared_imports';
import { trackUiMetric, METRIC_TYPE } from '../../../services/track_ui_metric';
import type { CcrApiError } from '../../../services/http_error';
import { getErrorBody } from '../../../services/http_error';
import { API_STATUS, UIM_AUTO_FOLLOW_PATTERN_LIST_LOAD } from '../../../constants';
import type { ApiStatus } from '../../../../../common/types';
import type { ParsedAutoFollowPattern } from '../../../store/reducers/auto_follow_pattern';
import { AutoFollowPatternTable, DetailPanel } from './components';

const REFRESH_RATE_MS = 30000;

const getQueryParamPattern = (history: History) => {
  const { pattern } = extractQueryParams(history.location.search);
  if (!pattern) {
    return null;
  }
  const patternStr = Array.isArray(pattern) ? pattern[0] : pattern;
  return decodeURIComponent(String(patternStr));
};

export interface AutoFollowPatternListProps extends RouteComponentProps {
  loadAutoFollowPatterns: (inBackground?: boolean) => void;
  selectAutoFollowPattern: (id: string | null) => void;
  loadAutoFollowStats: () => void;
  autoFollowPatterns: ParsedAutoFollowPattern[];
  autoFollowPatternId: string | null;
  apiStatus: ApiStatus;
  apiError: CcrApiError | null;
  isAuthorized: boolean;
}

interface AutoFollowPatternListState {
  lastAutoFollowPatternId: string | null;
  isDetailPanelOpen: boolean;
}

export class AutoFollowPatternList extends PureComponent<
  AutoFollowPatternListProps,
  AutoFollowPatternListState
> {
  private interval?: ReturnType<typeof setInterval>;

  static getDerivedStateFromProps(
    { autoFollowPatternId }: Pick<AutoFollowPatternListProps, 'autoFollowPatternId'>,
    { lastAutoFollowPatternId }: AutoFollowPatternListState
  ): Partial<AutoFollowPatternListState> | null {
    if (autoFollowPatternId !== lastAutoFollowPatternId) {
      return {
        lastAutoFollowPatternId: autoFollowPatternId,
        isDetailPanelOpen: !!autoFollowPatternId,
      };
    }
    return null;
  }

  state: AutoFollowPatternListState = {
    lastAutoFollowPatternId: null,
    isDetailPanelOpen: false,
  };

  componentDidMount() {
    const { loadAutoFollowPatterns, loadAutoFollowStats, selectAutoFollowPattern, history } =
      this.props;

    trackUiMetric(METRIC_TYPE.LOADED, UIM_AUTO_FOLLOW_PATTERN_LIST_LOAD);
    loadAutoFollowPatterns();
    loadAutoFollowStats();

    // Select the pattern in the URL query params
    selectAutoFollowPattern(getQueryParamPattern(history));

    // Interval to load auto-follow patterns in the background passing "true" to the fetch method
    this.interval = setInterval(() => loadAutoFollowPatterns(true), REFRESH_RATE_MS);
  }

  componentDidUpdate(prevProps: AutoFollowPatternListProps, prevState: AutoFollowPatternListState) {
    const { history, loadAutoFollowStats } = this.props;
    const { lastAutoFollowPatternId } = this.state;

    /**
     * Each time our state is updated (through getDerivedStateFromProps())
     * we persist the auto-follow pattern id to query params for deep linking
     */
    if (lastAutoFollowPatternId !== prevState.lastAutoFollowPatternId) {
      if (!lastAutoFollowPatternId) {
        history.replace({
          search: '',
        });
      } else {
        history.replace({
          search: `?pattern=${encodeURIComponent(lastAutoFollowPatternId)}`,
        });

        loadAutoFollowStats();
      }
    }
  }

  componentWillUnmount() {
    if (this.interval !== undefined) {
      clearInterval(this.interval);
    }
  }

  renderEmpty() {
    return (
      <EuiPageTemplate.EmptyPrompt
        iconType="managementApp"
        data-test-subj="emptyPrompt"
        title={
          <h1>
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternList.emptyPromptTitle"
              defaultMessage="Create your first auto-follow pattern"
            />
          </h1>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternList.emptyPromptDescription"
              defaultMessage="Use an auto-follow pattern to automatically replicate indices from
              a remote cluster."
            />
          </p>
        }
        actions={
          <EuiButton
            {...reactRouterNavigate(this.props.history, `/auto_follow_patterns/add`)}
            fill
            iconType="plusCircle"
            data-test-subj="createAutoFollowPatternButton"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.addAutoFollowPatternButtonLabel"
              defaultMessage="Create auto-follow pattern"
            />
          </EuiButton>
        }
      />
    );
  }

  renderList() {
    const { selectAutoFollowPattern, autoFollowPatterns } = this.props;
    const { isDetailPanelOpen } = this.state;

    return (
      <>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternList.autoFollowPatternsDescription"
              defaultMessage="An auto-follow pattern replicates leader indices from a remote
              cluster and copies them to follower indices on the local cluster."
            />
          </p>
        </EuiText>

        <EuiSpacer size="l" />

        <AutoFollowPatternTable autoFollowPatterns={autoFollowPatterns} />

        {isDetailPanelOpen && (
          <DetailPanel closeDetailPanel={() => selectAutoFollowPattern(null)} />
        )}
      </>
    );
  }

  render() {
    const { autoFollowPatterns, apiError, apiStatus, isAuthorized } = this.props;
    const isEmpty = apiStatus === API_STATUS.IDLE && !autoFollowPatterns.length;

    if (!isAuthorized) {
      return (
        <PageError
          title={i18n.translate(
            'xpack.crossClusterReplication.autoFollowPatternList.permissionErrorTitle',
            {
              defaultMessage: 'Permission error',
            }
          )}
          error={{
            error: i18n.translate(
              'xpack.crossClusterReplication.autoFollowPatternList.noPermissionText',
              {
                defaultMessage: 'You do not have permission to view or add auto-follow patterns.',
              }
            ),
          }}
        />
      );
    }

    if (apiError) {
      const title = i18n.translate(
        'xpack.crossClusterReplication.autoFollowPatternList.loadingErrorTitle',
        {
          defaultMessage: 'Error loading auto-follow patterns',
        }
      );

      const body = getErrorBody(apiError);
      const error = { error: body?.message ?? apiError.message, statusCode: body?.statusCode };
      return <PageError title={title} error={error} />;
    }

    if (isEmpty) {
      return this.renderEmpty();
    }

    if (apiStatus === API_STATUS.LOADING) {
      return (
        <PageLoading>
          <FormattedMessage
            id="xpack.crossClusterReplication.autoFollowPatternList.loadingTitle"
            defaultMessage="Loading auto-follow patterns..."
          />
        </PageLoading>
      );
    }

    return this.renderList();
  }
}
