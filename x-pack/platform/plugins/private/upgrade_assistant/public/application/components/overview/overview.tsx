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
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { FormattedMessage } from '@kbn/i18n-react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import {
  ALTERNATIVE_VERSION_UPGRADE_FROM,
  ALTERNATIVE_VERSION_UPGRADE_TO,
  LATEST_VERSION,
  MIN_VERSION_TO_UPGRADE_TO_LATEST,
} from '../../../../common/constants';
import { useAppContext } from '../../app_context';
import { uiMetricService, UIM_OVERVIEW_PAGE_LOAD } from '../../lib/ui_metric';
import { getBackupStep } from './backup_step';
import { getFixIssuesStep } from './fix_issues_step';
import { getUpgradeStep } from './upgrade_step';
import { getMigrateSystemIndicesStep } from './migrate_system_indices';
import { getLogsStep } from './logs_step';

type OverviewStep = 'backup' | 'migrate_system_indices' | 'fix_issues' | 'logs';

export const Overview = withRouter(({ history }: RouteComponentProps) => {
  const {
    featureSet: { migrateSystemIndices },
    services: {
      breadcrumbs,
      core: { docLinks },
    },
    plugins: { cloud },
    kibanaVersionInfo: { currentMajor, currentMinor, currentPatch },
  } = useAppContext();

  const currentVersion = `${currentMajor}.${currentMinor}.${currentPatch}`;

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
    setCompletedStepsMap({
      ...completedStepsMap,
      [step]: isCompleted,
    });
  };

  const versionTooltipContent = () => {
    if (currentVersion >= MIN_VERSION_TO_UPGRADE_TO_LATEST) {
      return null;
    }

    return (
      <EuiToolTip
        position="right"
        content={
          <FormattedMessage
            id="xpack.upgradeAssistant.overview.latestMinVersionTooltip"
            defaultMessage="Upgrading to v{latestVersion} requires v{minVersionToUpgradeToLatest}.
            An alternative upgrade path is v{alternativeVersionUpgradeFrom} to v{alternativeVersionUpgradeTo} (when available)."
            values={{
              latestVersion: LATEST_VERSION,
              minVersionToUpgradeToLatest: MIN_VERSION_TO_UPGRADE_TO_LATEST,
              alternativeVersionUpgradeFrom: ALTERNATIVE_VERSION_UPGRADE_FROM,
              alternativeVersionUpgradeTo: ALTERNATIVE_VERSION_UPGRADE_TO,
            }}
          />
        }
      >
        <EuiIcon type="iInCircle" size="s" />
      </EuiToolTip>
    );
  };

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
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.versionInfo"
              defaultMessage="Current version: {currentVersion} | Latest available version: {latestVersion} {versionTooltip}"
              values={{
                currentVersion: <strong>{currentVersion}</strong>,
                latestVersion: <strong>{LATEST_VERSION}</strong>,
                versionTooltip: versionTooltipContent(),
              }}
            />
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
                      id="xpack.upgradeAssistant.overview.minorOfLatestMajorReleaseNotes"
                      defaultMessage="What's new in version v{latestVersion}"
                      values={{
                        latestVersion: LATEST_VERSION,
                      }}
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
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
});
