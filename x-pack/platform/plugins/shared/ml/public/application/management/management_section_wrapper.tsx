/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Router } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import { pick } from 'lodash';

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesContextProps, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { UpgradeWarning } from '../components/upgrade/upgrade_warning';
import { getMlGlobalServices } from '../util/get_services';
import { EnabledFeaturesContextProvider } from '../contexts/ml';
import { type MlFeatures, PLUGIN_ID } from '../../../common/constants/app';

import { checkGetManagementMlJobsResolver } from '../capabilities/check_capabilities';

import { AccessDeniedPage } from './jobs_list/components/access_denied_page';
import { InsufficientLicensePage } from './jobs_list/components/insufficient_license_page';

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

interface Props {
  coreStart: CoreStart;
  share: SharePluginStart;
  history: ManagementAppMountParams['history'];
  spacesApi?: SpacesPluginStart;
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  usageCollection?: UsageCollectionSetup;
  fieldFormats: FieldFormatsStart;
  isServerless: boolean;
  mlFeatures: MlFeatures;
  children: React.ReactNode;
}

export const ManagementSectionWrapper: FC<Props> = ({
  coreStart,
  share,
  history,
  spacesApi,
  data,
  charts,
  usageCollection,
  fieldFormats,
  isServerless,
  mlFeatures,
  children,
}) => {
  const [initialized, setInitialized] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isUpgradeInProgress, setIsUpgradeInProgress] = useState(false);
  const [isPlatinumOrTrialLicense, setIsPlatinumOrTrialLicense] = useState(true);

  const mlServices = useMemo(
    () => getMlGlobalServices(coreStart, data.dataViews, usageCollection),
    [coreStart, data.dataViews, usageCollection]
  );

  const datePickerDeps: DatePickerDependencies = {
    ...pick(coreStart, ['http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    data,
    uiSettingsKeys: UI_SETTINGS,
    showFrozenDataTierChoice: false,
  };

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ContextWrapper = useCallback(
    spacesApi ? spacesApi.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spacesApi]
  );

  if (initialized === false) {
    return null;
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
              spacesApi,
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
              charts,
              usageCollection,
              fieldFormats,
              spacesApi,
              mlServices,
            }}
          >
            <DatePickerContextProvider {...datePickerDeps}>
              <ContextWrapper feature={PLUGIN_ID}>
                <EnabledFeaturesContextProvider isServerless={isServerless} mlFeatures={mlFeatures}>
                  <Router history={history}>{children}</Router>
                </EnabledFeaturesContextProvider>
              </ContextWrapper>
            </DatePickerContextProvider>
          </KibanaContextProvider>
        </RedirectAppLinks>
      </KibanaRenderContextProvider>
    </I18nProvider>
  );
};
