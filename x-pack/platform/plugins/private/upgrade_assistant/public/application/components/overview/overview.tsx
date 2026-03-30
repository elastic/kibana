/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiSteps,
  EuiPageHeader,
  EuiSpacer,
  EuiLink,
  EuiPageBody,
  EuiPageSection,
  EuiText,
  EuiLoadingSpinner,
  EuiIconTip,
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { FormattedMessage } from '@kbn/i18n-react';

import { useAppContext } from '../../app_context';
import { uiMetricService, UIM_OVERVIEW_PAGE_LOAD } from '../../lib/ui_metric';
import { getBackupStep } from './backup_step';
import { getFixIssuesStep } from './fix_issues_step';
import { getUpgradeStep } from './upgrade_step';
import { getMigrateSystemIndicesStep } from './migrate_system_indices';
import { getLogsStep } from './logs_step';
import { useCloudStackVersionInfo } from './use_cloud_stack_version_info';
import { MachineLearningDisabledCallout } from './ml_callout/ml_callout';

type OverviewStep = 'backup' | 'migrate_system_indices' | 'fix_issues' | 'logs';

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

  const [mlEnabled, setMlEnabled] = useState<boolean>(true);

  useEffect(() => {
    api.getMLEnabled().then(({ data }) => {
      setMlEnabled(data.mlEnabled);
    });
  }, [api]);

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

  const latestVersionNode =
    cloudStackVersion.status === 'loaded' ? (
      <strong>{cloudStackVersion.latestAvailableVersion}</strong>
    ) : cloudStackVersion.status === 'error' ? (
      <strong>
        {i18n.translate('xpack.upgradeAssistant.overview.latestAvailableVersionUnavailable', {
          defaultMessage: 'Unavailable',
        })}
      </strong>
    ) : (
      <EuiLoadingSpinner
        size="s"
        aria-label={i18n.translate(
          'xpack.upgradeAssistant.overview.latestAvailableVersionLoading',
          {
            defaultMessage: 'Loading latest available version',
          }
        )}
      />
    );

  const directUpgradeableVersionRange =
    cloudStackVersion.status === 'loaded' ? cloudStackVersion.directUpgradeableVersionRange : null;

  const versionTooltipContent =
    cloudStackVersion.status === 'loaded' && cloudStackVersion.minVersionToUpgradeToLatest ? (
      <EuiIconTip
        position="right"
        content={
          <FormattedMessage
            id="xpack.upgradeAssistant.overview.latestMinVersionTooltip"
            defaultMessage="Upgrading to v{latestVersion} requires v{minVersionToUpgradeToLatest}."
            values={{
              latestVersion: cloudStackVersion.latestAvailableVersion,
              minVersionToUpgradeToLatest: cloudStackVersion.minVersionToUpgradeToLatest,
            }}
          />
        }
        type="info"
        size="s"
      />
    ) : null;

  const canUpgradeDirectlyToLatest =
    cloudStackVersion.status === 'loaded' && cloudStackVersion.minVersionToUpgradeToLatest === null;
  const shouldShowDirectUpgradeRangeLine =
    cloudStackVersion.status === 'loaded' &&
    !canUpgradeDirectlyToLatest &&
    directUpgradeableVersionRange !== null;

  return (
    <EuiPageBody restrictWidth={true} data-test-subj="overview">
      <EuiPageSection color="transparent" paddingSize="none">
        <EuiPageHeader
          bottomBorder
          data-test-subj="overviewPageHeader"
          pageTitle={i18n.translate('xpack.upgradeAssistant.overview.pageTitle', {
            defaultMessage: 'Upgrade Assistant',
          })}
          description={
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.overview.versionInfo"
                  defaultMessage="Current version: {currentVersion} | Latest available version: {latestVersion} {versionTooltip}"
                  values={{
                    currentVersion: <strong>{currentVersion}</strong>,
                    latestVersion: latestVersionNode,
                    versionTooltip: versionTooltipContent,
                  }}
                />
              </p>
              {shouldShowDirectUpgradeRangeLine && directUpgradeableVersionRange && (
                <em>
                  {directUpgradeableVersionRange.min === directUpgradeableVersionRange.max ? (
                    <FormattedMessage
                      id="xpack.upgradeAssistant.overview.directUpgradeSingle"
                      defaultMessage="From your current version, you can upgrade to version {version}."
                      values={{
                        version: directUpgradeableVersionRange.min,
                      }}
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.upgradeAssistant.overview.directUpgradeRange"
                      defaultMessage="From your current version, you can upgrade to versions {minVersion} - {maxVersion}."
                      values={{
                        minVersion: directUpgradeableVersionRange.min,
                        maxVersion: directUpgradeableVersionRange.max,
                      }}
                    />
                  )}
                </em>
              )}
            </EuiText>
          }
        >
          <EuiText>
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.linkToReleaseNotes"
              defaultMessage="{linkToReleaseNotes}"
              values={{
                linkToReleaseNotes: (
                  <EuiLink
                    data-test-subj="whatsNewLink"
                    href={docLinks.links.elasticsearch.latestReleaseHighlights}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.overview.releaseHighlightsLinkText"
                      defaultMessage="Elastic release notes"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
          {!mlEnabled && <MachineLearningDisabledCallout />}
        </EuiPageHeader>
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
  );
};
