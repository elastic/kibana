/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { RouteComponentProps } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { EuiSpacer } from '@elastic/eui';
import { AppHeader, type AppHeaderTab } from '@kbn/app-header';

import type { Section } from '../../constants';
import { BASE_PATH, UIM_REPOSITORY_SET_DEFAULT_PRIVILEGE_MISSING } from '../../constants';
import { useCanSetDefaultRepository } from '../../services/authorization';
import { useConfig, useCore, useServices } from '../../app_context';
import { breadcrumbService, docTitleService } from '../../services/navigation';

import { RepositoryList } from './repository_list';
import { SnapshotList } from './snapshot_list';
import { RestoreList } from './restore_list';
import { PolicyList } from './policy_list';

interface MatchParams {
  section: Section;
}

export const SnapshotRestoreHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
  const { slm_ui: slmUi } = useConfig();
  const { docLinks } = useCore();
  const { uiMetricService } = useServices();
  const canSetDefaultRepository = useCanSetDefaultRepository();
  const hasReportedMissingSetDefaultPrivilege = useRef(false);

  const onSectionChange = (newSection: Section) => {
    history.push(encodeURI(`${BASE_PATH}/${encodeURIComponent(newSection)}`));
  };

  const tabs: AppHeaderTab[] = [
    {
      id: 'snapshots',
      label: i18n.translate('xpack.snapshotRestore.home.snapshotsTabTitle', {
        defaultMessage: 'Snapshots',
      }),
      isSelected: section === 'snapshots',
      onClick: () => onSectionChange('snapshots'),
      'data-test-subj': 'snapshots_tab',
    },
    {
      id: 'repositories',
      label: i18n.translate('xpack.snapshotRestore.home.repositoriesTabTitle', {
        defaultMessage: 'Repositories',
      }),
      isSelected: section === 'repositories',
      onClick: () => onSectionChange('repositories'),
      'data-test-subj': 'repositories_tab',
    },
    {
      id: 'restore_status',
      label: i18n.translate('xpack.snapshotRestore.home.restoreTabTitle', {
        defaultMessage: 'Restore Status',
      }),
      isSelected: section === 'restore_status',
      onClick: () => onSectionChange('restore_status'),
      'data-test-subj': 'restore_status_tab',
    },
  ];

  if (slmUi.enabled) {
    tabs.splice(2, 0, {
      id: 'policies',
      label: i18n.translate('xpack.snapshotRestore.home.policiesTabTitle', {
        defaultMessage: 'Policies',
      }),
      isSelected: section === 'policies',
      onClick: () => onSectionChange('policies'),
      'data-test-subj': 'policies_tab',
    });
  }

  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(section || 'home');
    docTitleService.setTitle(section || 'home');
  }, [section]);

  useEffect(() => {
    if (canSetDefaultRepository || hasReportedMissingSetDefaultPrivilege.current) {
      return;
    }
    uiMetricService.trackUiMetric(UIM_REPOSITORY_SET_DEFAULT_PRIVILEGE_MISSING);
    hasReportedMissingSetDefaultPrivilege.current = true;
  }, [canSetDefaultRepository, uiMetricService]);

  return (
    <>
      <AppHeader
        title={i18n.translate('xpack.snapshotRestore.home.snapshotRestoreTitle', {
          defaultMessage: 'Snapshot and Restore',
        })}
        description={i18n.translate('xpack.snapshotRestore.home.snapshotRestoreDescription', {
          defaultMessage:
            'Use repositories to store and recover backups of your Elasticsearch indices and clusters.',
        })}
        tabs={tabs}
        docLink={docLinks.links.snapshotRestore.guide}
        spacing="bleed"
      />

      <EuiSpacer size="l" />

      <Routes>
        <Route
          exact
          path={`${BASE_PATH}/repositories/:repositoryName*`}
          component={RepositoryList}
        />
        {/* We have two separate SnapshotList routes because repository names could have slashes in
         *  them. This would break a route with a path like snapshots/:repositoryName?/:snapshotId*
         */}
        <Route exact path={`${BASE_PATH}/snapshots`} component={SnapshotList} />
        <Route
          exact
          path={`${BASE_PATH}/snapshots/:repositoryName*/:snapshotId`}
          component={SnapshotList}
        />
        <Route exact path={`${BASE_PATH}/restore_status`} component={RestoreList} />
        <Route exact path={`${BASE_PATH}/policies/:policyName*`} component={PolicyList} />
      </Routes>
    </>
  );
};
