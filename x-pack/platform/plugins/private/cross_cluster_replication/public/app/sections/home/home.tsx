/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { i18n } from '@kbn/i18n';
import { AppHeader, type AppHeaderMenu, type AppHeaderTab } from '@kbn/app-header';

import { EuiSpacer } from '@elastic/eui';

import type { ApiStatus, FollowerIndexWithPausedStatus } from '../../../../common/types';
import type { ParsedAutoFollowPattern } from '../../store/reducers/auto_follow_pattern';
import type { CcrApiError } from '../../services/http_error';
import { setBreadcrumbs, listBreadcrumb } from '../../services/breadcrumbs';
import { documentationLinks } from '../../services/documentation_links';
import { routing } from '../../services/routing';
import { API_STATUS } from '../../constants';
import { AutoFollowPatternList } from './auto_follow_pattern_list';
import { FollowerIndicesList } from './follower_indices_list';

const FOLLOWER_INDICES_SECTION = 'follower_indices';
const AUTO_FOLLOW_PATTERNS_SECTION = 'auto_follow_patterns';
const ADD_FOLLOWER_INDEX_PATH = '/follower_indices/add';
const ADD_AUTO_FOLLOW_PATTERN_PATH = '/auto_follow_patterns/add';

const ccrHomeTitle = i18n.translate(
  'xpack.crossClusterReplication.autoFollowPatternList.crossClusterReplicationTitle',
  {
    defaultMessage: 'Cross-Cluster Replication',
  }
);

const followerIndicesTabLabel = i18n.translate(
  'xpack.crossClusterReplication.autoFollowPatternList.followerIndicesTitle',
  {
    defaultMessage: 'Follower indices',
  }
);

const autoFollowPatternsTabLabel = i18n.translate(
  'xpack.crossClusterReplication.autoFollowPatternList.autoFollowPatternsTitle',
  {
    defaultMessage: 'Auto-follow patterns',
  }
);

const followerIndicesDescription = i18n.translate(
  'xpack.crossClusterReplication.followerIndexList.followerIndicesDescription',
  {
    defaultMessage: 'A follower index replicates a leader index on a remote cluster.',
  }
);

const autoFollowPatternsDescription = i18n.translate(
  'xpack.crossClusterReplication.autoFollowPatternList.autoFollowPatternsDescription',
  {
    defaultMessage:
      'An auto-follow pattern replicates leader indices from a remote cluster and copies them to follower indices on the local cluster.',
  }
);

const createFollowerIndexButtonLabel = i18n.translate(
  'xpack.crossClusterReplication.followerIndexList.addFollowerButtonLabel',
  {
    defaultMessage: 'Create a follower index',
  }
);

const createAutoFollowPatternButtonLabel = i18n.translate(
  'xpack.crossClusterReplication.autoFollowPatternList.addAutoFollowPatternButtonLabel',
  {
    defaultMessage: 'Create an auto-follow pattern',
  }
);

export interface CrossClusterReplicationHomeProps extends RouteComponentProps<{ section: string }> {
  autoFollowPatterns: ParsedAutoFollowPattern[];
  isAutoFollowApiAuthorized: boolean;
  autoFollowApiStatus: ApiStatus;
  autoFollowApiError: CcrApiError | null;
  followerIndices: FollowerIndexWithPausedStatus[];
  isFollowerIndexApiAuthorized: boolean;
  followerIndexApiStatus: ApiStatus;
  followerIndexApiError: CcrApiError | null;
}

interface CrossClusterReplicationHomeState {
  activeSection: string;
}

export class CrossClusterReplicationHome extends PureComponent<
  CrossClusterReplicationHomeProps,
  CrossClusterReplicationHomeState
> {
  state: CrossClusterReplicationHomeState = {
    activeSection: FOLLOWER_INDICES_SECTION,
  };

  componentDidMount() {
    setBreadcrumbs([listBreadcrumb()]);
  }

  static getDerivedStateFromProps(props: CrossClusterReplicationHomeProps) {
    const {
      match: {
        params: { section },
      },
    } = props;
    return {
      activeSection: section,
    };
  }

  onSectionChange = (section: string) => {
    setBreadcrumbs([listBreadcrumb(`/${section}`)]);
    routing.navigate(`/${section}`);
  };

  getCreateMenu = (): AppHeaderMenu | undefined => {
    const {
      history,
      autoFollowPatterns,
      isAutoFollowApiAuthorized,
      autoFollowApiStatus,
      autoFollowApiError,
      followerIndices,
      isFollowerIndexApiAuthorized,
      followerIndexApiStatus,
      followerIndexApiError,
    } = this.props;
    const { activeSection } = this.state;

    const isFollowerTab = activeSection === FOLLOWER_INDICES_SECTION;
    const items = isFollowerTab ? followerIndices : autoFollowPatterns;
    const apiStatus = isFollowerTab ? followerIndexApiStatus : autoFollowApiStatus;
    const apiError = isFollowerTab ? followerIndexApiError : autoFollowApiError;
    const isAuthorized = isFollowerTab ? isFollowerIndexApiAuthorized : isAutoFollowApiAuthorized;

    const showCreateInHeader =
      isAuthorized && !apiError && apiStatus !== API_STATUS.LOADING && items.length > 0;

    if (!showCreateInHeader) {
      return undefined;
    }

    if (isFollowerTab) {
      return {
        primaryActionItem: {
          id: 'createFollowerIndex',
          label: createFollowerIndexButtonLabel,
          iconType: 'plusCircle',
          testId: 'createFollowerIndexButton',
          href: history.createHref({ pathname: ADD_FOLLOWER_INDEX_PATH }),
          run: () => history.push(ADD_FOLLOWER_INDEX_PATH),
        },
      };
    }

    return {
      primaryActionItem: {
        id: 'createAutoFollowPattern',
        label: createAutoFollowPatternButtonLabel,
        iconType: 'plusCircle',
        testId: 'createAutoFollowPatternButton',
        href: history.createHref({ pathname: ADD_AUTO_FOLLOW_PATTERN_PATH }),
        run: () => history.push(ADD_AUTO_FOLLOW_PATTERN_PATH),
      },
    };
  };

  render() {
    const { activeSection } = this.state;
    const isFollowerTab = activeSection === FOLLOWER_INDICES_SECTION;

    const tabs: AppHeaderTab[] = [
      {
        id: FOLLOWER_INDICES_SECTION,
        label: followerIndicesTabLabel,
        isSelected: isFollowerTab,
        onClick: () => this.onSectionChange(FOLLOWER_INDICES_SECTION),
        'data-test-subj': 'followerIndicesTab',
      },
      {
        id: AUTO_FOLLOW_PATTERNS_SECTION,
        label: autoFollowPatternsTabLabel,
        isSelected: activeSection === AUTO_FOLLOW_PATTERNS_SECTION,
        onClick: () => this.onSectionChange(AUTO_FOLLOW_PATTERNS_SECTION),
        'data-test-subj': 'autoFollowPatternsTab',
      },
    ];

    return (
      <>
        <AppHeader
          title={ccrHomeTitle}
          description={isFollowerTab ? followerIndicesDescription : autoFollowPatternsDescription}
          tabs={tabs}
          menu={this.getCreateMenu()}
          docLink={
            isFollowerTab
              ? documentationLinks.apis.createFollower
              : documentationLinks.apis.createAutoFollowPattern
          }
          spacing="bleed"
        />

        <EuiSpacer size="l" />

        <Routes>
          <Route exact path={`/${FOLLOWER_INDICES_SECTION}`} component={FollowerIndicesList} />
          <Route
            exact
            path={`/${AUTO_FOLLOW_PATTERNS_SECTION}`}
            component={AutoFollowPatternList}
          />
        </Routes>
      </>
    );
  }
}
