/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { EuiSteps, EuiSpacer, EuiPageBody, EuiPageSection } from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';

import { useAppContext } from '../../app_context';
import { uiMetricService, UIM_OVERVIEW_PAGE_LOAD } from '../../lib/ui_metric';
import { getBackupStep } from './backup_step';
import { getFixIssuesStep } from './fix_issues_step';
import { getUpgradeStep } from './upgrade_step';
import { getMigrateSystemIndicesStep } from './migrate_system_indices';
import { getLogsStep } from './logs_step';
import type { CloudStackVersionState } from './use_cloud_stack_version_info';
import { useCloudStackVersionInfo } from './use_cloud_stack_version_info';

type OverviewStep = 'backup' | 'migrate_system_indices' | 'fix_issues' | 'logs';

const pageTitle = i18n.translate('xpack.upgradeAssistant.overview.pageTitle', {
  defaultMessage: 'Upgrade Assistant',
});

const releaseNotesLabel = i18n.translate(
  'xpack.upgradeAssistant.overview.releaseHighlightsLinkText',
  {
    defaultMessage: 'Elastic release notes',
  }
);

const getLatestVersionLabel = (cloudStackVersion: CloudStackVersionState): string => {
  if (cloudStackVersion.status === 'loaded') {
    return cloudStackVersion.latestAvailableVersion;
  }

  if (cloudStackVersion.status === 'error') {
    return i18n.translate('xpack.upgradeAssistant.overview.latestAvailableVersionUnavailable', {
      defaultMessage: 'Unavailable',
    });
  }

  return i18n.translate('xpack.upgradeAssistant.overview.latestAvailableVersionLoading', {
    defaultMessage: 'Loading…',
  });
};

const getOverviewDescription = (
  cloudStackVersion: CloudStackVersionState,
  currentVersion: string
): string => {
  const versionTooltip =
    cloudStackVersion.status === 'loaded' && cloudStackVersion.minVersionToUpgradeToLatest
      ? i18n.translate('xpack.upgradeAssistant.overview.latestMinVersionTooltip', {
          defaultMessage: 'Upgrading to v{latestVersion} requires v{minVersionToUpgradeToLatest}.',
          values: {
            latestVersion: cloudStackVersion.latestAvailableVersion,
            minVersionToUpgradeToLatest: cloudStackVersion.minVersionToUpgradeToLatest,
          },
        })
      : '';

  const parts = [
    i18n.translate('xpack.upgradeAssistant.overview.versionInfo', {
      defaultMessage:
        'Current version: {currentVersion} | Latest available version: {latestVersion} {versionTooltip}',
      values: {
        currentVersion,
        latestVersion: getLatestVersionLabel(cloudStackVersion),
        versionTooltip,
      },
    }),
  ];

  const canUpgradeDirectlyToLatest =
    cloudStackVersion.status === 'loaded' && cloudStackVersion.minVersionToUpgradeToLatest === null;
  const directUpgradeableVersionRange =
    cloudStackVersion.status === 'loaded' ? cloudStackVersion.directUpgradeableVersionRange : null;
  const shouldShowDirectUpgradeRangeLine =
    cloudStackVersion.status === 'loaded' &&
    !canUpgradeDirectlyToLatest &&
    directUpgradeableVersionRange !== null;

  if (shouldShowDirectUpgradeRangeLine && directUpgradeableVersionRange) {
    parts.push(
      directUpgradeableVersionRange.min === directUpgradeableVersionRange.max
        ? i18n.translate('xpack.upgradeAssistant.overview.directUpgradeSingle', {
            defaultMessage: 'From your current version, you can upgrade to version {version}.',
            values: {
              version: directUpgradeableVersionRange.min,
            },
          })
        : i18n.translate('xpack.upgradeAssistant.overview.directUpgradeRange', {
            defaultMessage:
              'From your current version, you can upgrade to versions {minVersion} - {maxVersion}.',
            values: {
              minVersion: directUpgradeableVersionRange.min,
              maxVersion: directUpgradeableVersionRange.max,
            },
          })
    );
  }

  return parts.join(' ');
};

export const Overview = () => {
  const {
    featureSet: { migrateSystemIndices },
    services: {
      api,
      breadcrumbs,
      core: { docLinks },
    },
    plugins: { cloud },
    kibanaVersionInfo: { currentMajor, currentMinor, currentPatch },
  } = useAppContext();

  const currentVersion = `${currentMajor}.${currentMinor}.${currentPatch}`;

  const cloudStackVersion = useCloudStackVersionInfo(api, currentVersion);

  useEffect(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.LOADED, UIM_OVERVIEW_PAGE_LOAD);
  }, []);

  useEffect(() => {
    breadcrumbs.setBreadcrumbs('overview');
  }, [breadcrumbs]);

  const [completedStepsMap, setCompletedStepsMap] = useState({
    backup: false,
    migrate_system_indices: false,
    fix_issues: false,
    logs: false,
  });

  const isStepComplete = (step: OverviewStep) => completedStepsMap[step];
  const setCompletedStep = (step: OverviewStep, isCompleted: boolean) => {
    setCompletedStepsMap((prevStepsMap) => ({
      ...prevStepsMap,
      [step]: isCompleted,
    }));
  };

  const description = useMemo(
    () => getOverviewDescription(cloudStackVersion, currentVersion),
    [cloudStackVersion, currentVersion]
  );

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'whatsNew',
          label: releaseNotesLabel,
          iconType: 'external',
          testId: 'whatsNewLink',
          href: docLinks.links.elasticsearch.latestReleaseHighlights,
          target: '_blank',
        },
      ],
    }),
    [docLinks.links.elasticsearch.latestReleaseHighlights]
  );

  return (
    <div data-test-subj="overview">
      <AppHeader title={pageTitle} description={description} menu={menu} spacing="bleed" />
      <EuiPageBody restrictWidth={true}>
        <EuiPageSection color="transparent" paddingSize="none">
          <EuiSpacer size="l" />
          <EuiSteps
            steps={
              [
                getBackupStep({
                  cloud,
                  isComplete: isStepComplete('backup'),
                  setIsComplete: setCompletedStep.bind(null, 'backup'),
                }),
                migrateSystemIndices &&
                  getMigrateSystemIndicesStep({
                    docLinks,
                    isComplete: isStepComplete('migrate_system_indices'),
                    setIsComplete: setCompletedStep.bind(null, 'migrate_system_indices'),
                  }),
                getFixIssuesStep({
                  isComplete: isStepComplete('fix_issues'),
                  setIsComplete: setCompletedStep.bind(null, 'fix_issues'),
                }),
                getLogsStep({
                  isComplete: isStepComplete('logs'),
                  setIsComplete: setCompletedStep.bind(null, 'logs'),
                }),
                getUpgradeStep(),
              ].filter(Boolean) as EuiStepProps[]
            }
          />
        </EuiPageSection>
      </EuiPageBody>
    </div>
  );
};
