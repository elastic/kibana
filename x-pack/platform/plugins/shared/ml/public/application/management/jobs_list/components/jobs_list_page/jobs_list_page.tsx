/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { Router } from '@kbn/shared-ux-router';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
} from '@elastic/eui';

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { SpaceManagementContextWrapper } from '../../../../components/space_management_context_wrapper';
import { UpgradeWarning } from '../../../../components/upgrade/upgrade_warning';
import { getMlGlobalServices } from '../../../../util/get_services';
import { EnabledFeaturesContextProvider } from '../../../../contexts/ml';
import { type MlFeatures, PLUGIN_ID } from '../../../../../../common/constants/app';

import { checkGetManagementMlJobsResolver } from '../../../../capabilities/check_capabilities';

import { AccessDeniedPage } from '../access_denied_page';
import { InsufficientLicensePage } from '../insufficient_license_page';
import { JobSpacesSyncFlyout } from '../../../../components/job_spaces_sync';
import { ExportJobsFlyout, ImportJobsFlyout } from '../../../../components/import_export_jobs';
import type { MlSavedObjectType } from '../../../../../../common/types/saved_objects';

import { SpaceManagement } from './space_management';
import { DocsLink } from './docs_link';

interface Props {
  coreStart: CoreStart;
  share: SharePluginStart;
  history: ManagementAppMountParams['history'];
  spaces?: SpacesPluginStart;
  data: DataPublicPluginStart;
  usageCollection?: UsageCollectionSetup;
  fieldFormats: FieldFormatsStart;
  isServerless: boolean;
  mlFeatures: MlFeatures;
}

export const JobsListPage: FC<Props> = ({
  coreStart,
  share,
  history,
  spaces,
  data,
  usageCollection,
  fieldFormats,
  isServerless,
  mlFeatures,
}) => {
  const [initialized, setInitialized] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isUpgradeInProgress, setIsUpgradeInProgress] = useState(false);
  const [isPlatinumOrTrialLicense, setIsPlatinumOrTrialLicense] = useState(true);
  const [showSyncFlyout, setShowSyncFlyout] = useState(false);
  const [currentTabId, setCurrentTabId] = useState<MlSavedObjectType>('anomaly-detector');
  // callback to allow import flyout to refresh jobs list
  const [refreshJobs, setRefreshJobs] = useState<(() => void) | null>(null);

  const mlServices = useMemo(
    () => getMlGlobalServices(coreStart, data.dataViews, usageCollection),
    [coreStart, data.dataViews, usageCollection]
  );

  const check = async () => {
    try {
      await checkGetManagementMlJobsResolver(mlServices);
    } catch (e) {
      if (e.mlFeatureEnabledInSpace && e.isPlatinumOrTrialLicense === false) {
        setIsPlatinumOrTrialLicense(false);
      } else if (e.isUpgradeInProgress) {
        setIsUpgradeInProgress(true);
      } else {
        setAccessDenied(true);
      }
    }
    setInitialized(true);
  };

  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (initialized === false) {
    return null;
  }

  function onCloseSyncFlyout() {
    if (typeof refreshJobs === 'function') {
      refreshJobs();
    }
    setShowSyncFlyout(false);
  }

  if (isUpgradeInProgress) {
    return (
      <I18nProvider>
        <KibanaRenderContextProvider {...coreStart}>
          <KibanaContextProvider
            services={{
              ...coreStart,
              share,
              data,
              usageCollection,
              fieldFormats,
              spaces,
              mlServices,
            }}
          >
            <UpgradeWarning />
          </KibanaContextProvider>
        </KibanaRenderContextProvider>
      </I18nProvider>
    );
  }

  if (accessDenied) {
    return (
      <I18nProvider>
        <KibanaRenderContextProvider {...coreStart}>
          <AccessDeniedPage />
        </KibanaRenderContextProvider>
      </I18nProvider>
    );
  }

  if (isPlatinumOrTrialLicense === false) {
    return (
      <I18nProvider>
        <KibanaRenderContextProvider {...coreStart}>
          <InsufficientLicensePage basePath={coreStart.http.basePath} />
        </KibanaRenderContextProvider>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <KibanaRenderContextProvider {...coreStart}>
        <RedirectAppLinks
          coreStart={{
            application: coreStart.application,
          }}
        >
          <KibanaContextProvider
            services={{
              ...coreStart,
              share,
              data,
              usageCollection,
              fieldFormats,
              spaces,
              mlServices,
            }}
          >
            <SpaceManagementContextWrapper feature={PLUGIN_ID}>
              <EnabledFeaturesContextProvider isServerless={isServerless} mlFeatures={mlFeatures}>
                <Router history={history}>
                  <EuiPageTemplate.Header
                    pageTitle={
                      <FormattedMessage
                        id="xpack.ml.management.jobsList.jobsListTitle"
                        defaultMessage="Machine Learning"
                      />
                    }
                    description={
                      <FormattedMessage
                        id="xpack.ml.management.jobsList.jobsListTagline"
                        defaultMessage="Identify, analyze, and process your data using advanced analysis techniques."
                      />
                    }
                    rightSideItems={[<DocsLink currentTabId={currentTabId} />]}
                    bottomBorder
                    paddingSize={'none'}
                  />

                  <EuiSpacer size="l" />

                  <EuiPageTemplate.Section
                    paddingSize={'none'}
                    id="kibanaManagementMLSection"
                    data-test-subj="mlPageStackManagementJobsList"
                  >
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <>
                          <EuiButtonEmpty
                            onClick={() => setShowSyncFlyout(true)}
                            data-test-subj="mlStackMgmtSyncButton"
                          >
                            {i18n.translate('xpack.ml.management.jobsList.syncFlyoutButton', {
                              defaultMessage: 'Synchronize saved objects',
                            })}
                          </EuiButtonEmpty>
                          {showSyncFlyout && <JobSpacesSyncFlyout onClose={onCloseSyncFlyout} />}
                          <EuiSpacer size="s" />
                        </>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <ExportJobsFlyout
                          isDisabled={false}
                          currentTab={
                            currentTabId === 'trained-model' ? 'anomaly-detector' : currentTabId
                          }
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <ImportJobsFlyout isDisabled={false} onImportComplete={refreshJobs} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <SpaceManagement
                      spacesApi={spaces}
                      onTabChange={setCurrentTabId}
                      onReload={setRefreshJobs}
                    />
                  </EuiPageTemplate.Section>
                </Router>
              </EnabledFeaturesContextProvider>
            </SpaceManagementContextWrapper>
          </KibanaContextProvider>
        </RedirectAppLinks>
      </KibanaRenderContextProvider>
    </I18nProvider>
  );
};
