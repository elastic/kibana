/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import type { ReactNode } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiSpacer, EuiPageHeader } from '@elastic/eui';

import type { FollowerIndexWithPausedStatus } from '../../../../common/types';
import type { ParsedAutoFollowPattern } from '../../store/reducers/auto_follow_pattern';
import { setBreadcrumbs, listBreadcrumb } from '../../services/breadcrumbs';
import { routing } from '../../services/routing';
import { AutoFollowPatternList } from './auto_follow_pattern_list';
import { FollowerIndicesList } from './follower_indices_list';

export interface CrossClusterReplicationHomeProps extends RouteComponentProps<{ section: string }> {
  autoFollowPatterns: ParsedAutoFollowPattern[];
  isAutoFollowApiAuthorized: boolean;
  followerIndices: FollowerIndexWithPausedStatus[];
  isFollowerIndexApiAuthorized: boolean;
}

interface CrossClusterReplicationHomeState {
  activeSection: string;
}

interface HomeTab {
  id: string;
  name: ReactNode;
  testSubj: string;
}

export class CrossClusterReplicationHome extends PureComponent<
  CrossClusterReplicationHomeProps,
  CrossClusterReplicationHomeState
> {
  state: CrossClusterReplicationHomeState = {
    activeSection: 'follower_indices',
  };

  readonly tabs: HomeTab[] = [
    {
      id: 'follower_indices',
      name: (
        <FormattedMessage
          id="xpack.crossClusterReplication.autoFollowPatternList.followerIndicesTitle"
          defaultMessage="Follower indices"
        />
      ),
      testSubj: 'followerIndicesTab',
    },
    {
      id: 'auto_follow_patterns',
      name: (
        <FormattedMessage
          id="xpack.crossClusterReplication.autoFollowPatternList.autoFollowPatternsTitle"
          defaultMessage="Auto-follow patterns"
        />
      ),
      testSubj: 'autoFollowPatternsTab',
    },
  ];

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

  render() {
    return (
      <>
        <EuiPageHeader
          bottomBorder
          pageTitle={
            <span data-test-subj="appTitle">
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternList.crossClusterReplicationTitle"
                defaultMessage="Cross-Cluster Replication"
              />
            </span>
          }
          tabs={this.tabs.map((tab) => ({
            onClick: () => this.onSectionChange(tab.id),
            isSelected: tab.id === this.state.activeSection,
            key: tab.id,
            'data-test-subj': tab.testSubj,
            label: tab.name,
          }))}
        />

        <EuiSpacer size="l" />

        <Routes>
          <Route exact path={`/follower_indices`} component={FollowerIndicesList} />
          <Route exact path={`/auto_follow_patterns`} component={AutoFollowPatternList} />
        </Routes>
      </>
    );
  }
}
