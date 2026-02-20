/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPage, EuiPageBody, EuiPageTemplate, EuiTab, EuiTabs, EuiSpacer } from '@elastic/eui';
import type { FC, PropsWithChildren } from 'react';
import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AutoOpsPromotionCallout } from '@kbn/autoops-promotion-callout';
import { useTitle } from '../hooks/use_title';
import { MonitoringToolbar } from '../../components/shared/toolbar';
import { useMonitoringTimeContainerContext } from '../hooks/use_monitoring_time';
import { PageLoading } from '../../components';
import {
  getSetupModeState,
  isSetupModeFeatureEnabled,
  toggleSetupMode,
  updateSetupModeData,
} from '../../lib/setup_mode';
import { SetupModeFeature } from '../../../common/enums';
import { AlertsDropdown } from '../../alerts/alerts_dropdown';
import { useRequestErrorHandler } from '../hooks/use_request_error_handler';
import { SetupModeToggleButton } from '../../components/setup_mode/toggle_button';
import { HeaderActionMenuContext } from '../contexts/header_action_menu_context';
import { HeaderMenuPortal } from '../../components/header_menu';
import { Legacy } from '../../legacy_shims';
import type { MonitoringStartServices } from '../../types';

export interface TabMenuItem {
  id: string;
  label: string;
  testSubj?: string;
  route?: string;
  onClick?: () => void;
  prepend?: React.ReactNode;
}
export interface PageTemplateProps {
  title: string;
  pageTitle?: string;
  tabs?: TabMenuItem[];
  getPageData?: () => Promise<void>;
  product?: string;
  showAutoOpsPromotion?: boolean;
}

export const PageTemplate: FC<PropsWithChildren<PageTemplateProps>> = ({
  title,
  pageTitle,
  tabs,
  getPageData,
  product,
  showAutoOpsPromotion,
  children,
}) => {
  useTitle('', title);

  const { currentTimerange } = useMonitoringTimeContainerContext();
  const [loaded, setLoaded] = useState(false);
  const [isRequestPending, setIsRequestPending] = useState(false);
  const history = useHistory();
  const [hasError, setHasError] = useState(false);
  const handleRequestError = useRequestErrorHandler();
  const { setHeaderActionMenu, theme$ } = useContext(HeaderActionMenuContext);
  const { services } = useKibana<MonitoringStartServices>();
  const learnMoreLink = services.docLinks.links.cloud.connectToAutoops;
  const cloudConnectUrl = services.application.getUrlForApp('cloud_connect');
  const handleConnectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    services.application.navigateToApp('cloud_connect');
  };
  const hasCloudConnectPermission = Boolean(
    services.application.capabilities.cloudConnect?.show ||
      services.application.capabilities.cloudConnect?.configure
  );

  const getPageDataResponseHandler = useCallback(
    (result: any) => {
      setHasError(false);
      return result;
    },
    [setHasError]
  );

  useEffect(() => {
    setIsRequestPending(true);
    getPageData?.()
      .then(getPageDataResponseHandler)
      .catch((err: IHttpFetchError<ResponseErrorBody>) => {
        handleRequestError(err);
        setHasError(true);
      })
      .finally(() => {
        setLoaded(true);
        setIsRequestPending(false);
      });
  }, [getPageData, currentTimerange, getPageDataResponseHandler, handleRequestError]);

  const onRefresh = () => {
    // don't refresh when a request is pending
    if (isRequestPending) return;
    setIsRequestPending(true);
    getPageData?.()
      .then(getPageDataResponseHandler)
      .catch(handleRequestError)
      .finally(() => {
        setIsRequestPending(false);
      });

    if (isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
      updateSetupModeData();
    }
  };

  const createHref = (route: string) => history.createHref({ pathname: route });

  const isTabSelected = (route: string) => history.location.pathname === route;

  const renderContent = () => {
    if (hasError) return null;
    if (getPageData && !loaded) return <PageLoading />;
    return children;
  };

  const { supported, enabled } = getSetupModeState();

  // Check AutoOps connection status
  const cloudConnectStatus = Legacy.shims.useCloudConnectStatus();
  const shouldShowAutoOpsPromotion =
    showAutoOpsPromotion &&
    !Legacy.shims.isCloud &&
    Legacy.shims.hasEnterpriseLicense &&
    !cloudConnectStatus.isLoading &&
    !cloudConnectStatus.isCloudConnectAutoopsEnabled;

  return (
    <EuiPageTemplate
      offset={0}
      restrictWidth={false}
      grow={false}
      data-test-subj="monitoringAppContainer"
    >
      <EuiPageTemplate.Section>
        {setHeaderActionMenu && theme$ && (
          <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
            {supported && (
              <SetupModeToggleButton enabled={enabled} toggleSetupMode={toggleSetupMode} />
            )}
            <AlertsDropdown />
          </HeaderMenuPortal>
        )}
        <MonitoringToolbar pageTitle={pageTitle} onRefresh={onRefresh} />
        <EuiSpacer size="m" />
        {shouldShowAutoOpsPromotion && (
          <AutoOpsPromotionCallout
            learnMoreLink={learnMoreLink}
            cloudConnectUrl={cloudConnectUrl}
            onConnectClick={handleConnectClick}
            hasCloudConnectPermission={hasCloudConnectPermission}
          />
        )}
        <EuiSpacer size="m" />
        {tabs && (
          <EuiTabs size="l">
            {tabs.map((item, idx) => {
              return (
                <EuiTab
                  key={idx}
                  disabled={isDisabledTab(product)}
                  title={item.label}
                  data-test-subj={item.testSubj}
                  href={item.route ? createHref(item.route) : undefined}
                  isSelected={item.route ? isTabSelected(item.route) : undefined}
                  onClick={item.onClick}
                  prepend={item.prepend}
                >
                  {item.label}
                </EuiTab>
              );
            })}
          </EuiTabs>
        )}

        <EuiPage paddingSize="m">
          <EuiPageBody>{renderContent()}</EuiPageBody>
        </EuiPage>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

function isDisabledTab(product: string | undefined) {
  const setupMode = getSetupModeState();
  if (!isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
    return false;
  }

  if (!setupMode.data) {
    return false;
  }

  if (!product) {
    return false;
  }

  const data = setupMode.data[product] || {};
  if (data.totalUniqueInstanceCount === 0) {
    return true;
  }
  if (
    data.totalUniqueInternallyCollectedCount === 0 &&
    data.totalUniqueFullyMigratedCount === 0 &&
    data.totalUniquePartiallyMigratedCount === 0
  ) {
    return true;
  }
  return false;
}
