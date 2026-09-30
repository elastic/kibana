/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPage, EuiPageBody, EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderTab, AppHeaderMenu } from '@kbn/app-header';
import type { FC, PropsWithChildren } from 'react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AutoOpsPromotionCallout, AutoOpsEnabledCallout } from '@kbn/autoops-promotion-callout';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { useTitle } from '../hooks/use_title';
import { MonitoringToolbar } from '../../components/shared/toolbar';
import { useMonitoringTimeContainerContext } from '../hooks/use_monitoring_time';
import { PageLoading } from '../../components';
import {
  getSetupModeState,
  isSetupModeFeatureEnabled,
  subscribeSetupModeState,
  toggleSetupMode,
  updateSetupModeData,
} from '../../lib/setup_mode';
import { SetupModeFeature } from '../../../common/enums';
import { TELEMETRY_METRIC_BUTTON_CLICK } from '../../../common/constants';
import { useAlertsModal } from '../hooks/use_alerts_modal';
import { WatcherMigrationStep } from '../../alerts/enable_alerts_modal';
import { useRequestErrorHandler } from '../hooks/use_request_error_handler';
import { useUiTracker } from '../hooks/use_track_metric';
import { Legacy } from '../../legacy_shims';
import type { MonitoringStartServices } from '../../types';
import { useClusterListingAvailability } from '../contexts/cluster_listing_availability_context';
import { getMonitoringBack } from './get_monitoring_back';

export interface TabMenuItem {
  id: string;
  label: string;
  testSubj?: string;
  route?: string;
  onClick?: () => void;
  betaTooltip?: string;
}
export interface PageTemplateProps {
  title: string;
  pageTitle?: string;
  tabs?: TabMenuItem[];
  getPageData?: () => Promise<void>;
  product?: string;
  showAutoOpsPromotion?: boolean;
  showAutoOpsEnabledBanner?: boolean;
}

export const PageTemplate: FC<PropsWithChildren<PageTemplateProps>> = ({
  title,
  pageTitle,
  tabs,
  getPageData,
  product,
  showAutoOpsPromotion,
  showAutoOpsEnabledBanner,
  children,
}) => {
  useTitle('', title);

  const { currentTimerange } = useMonitoringTimeContainerContext();
  const { hasClusterListing } = useClusterListingAvailability();
  const [loaded, setLoaded] = useState(false);
  const [isRequestPending, setIsRequestPending] = useState(false);
  const history = useHistory();
  const [hasError, setHasError] = useState(false);
  const handleRequestError = useRequestErrorHandler();
  const { services } = useKibana<MonitoringStartServices>();
  const cloudConnectUrl = services.application.getUrlForApp('cloud_connect');
  const handleConnectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    services.application.navigateToApp('cloud_connect');
  };
  const hasCloudConnectPermission = Boolean(
    services.application.capabilities.cloudConnect?.show ||
      services.application.capabilities.cloudConnect?.configure
  );
  const trackStat = useUiTracker();
  const alertsEnableModalProvider = useAlertsModal();
  const [shouldShowAlertsModal, setShouldShowAlertsModal] = useState(false);
  const [setupMode, setSetupMode] = useState(() => {
    const state = getSetupModeState();
    return { supported: state.supported, enabled: state.enabled };
  });

  useEffect(
    () =>
      subscribeSetupModeState(() => {
        const state = getSetupModeState();
        setSetupMode({ supported: state.supported, enabled: state.enabled });
      }),
    []
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

  const { pathname, search } = history.location;
  const createHref = useCallback(
    (route: string) => history.createHref({ pathname: route, search }),
    [history, search]
  );

  const renderContent = () => {
    if (hasError) return null;
    if (getPageData && !loaded) return <PageLoading />;
    return children;
  };

  const { supported, enabled } = setupMode;

  const hideAnnouncements = !services.notifications.tours.isEnabled();
  const cloudConnectStatus = Legacy.shims.useCloudConnectStatus();

  const shouldShowAutoOpsPromotion =
    showAutoOpsPromotion &&
    !Legacy.shims.isCloud &&
    !Legacy.shims.isAirGapped &&
    !cloudConnectStatus.isLoading &&
    !cloudConnectStatus.isCloudConnectAutoopsEnabled &&
    !hideAnnouncements;

  const shouldShowAutoOpsEnabledBanner =
    showAutoOpsEnabledBanner &&
    !Legacy.shims.isAirGapped &&
    cloudConnectStatus.isCloudConnectAutoopsEnabled &&
    !hideAnnouncements;

  const tabsDisabled = isDisabledTab(product);

  const headerTabs = useMemo<AppHeaderTab[] | undefined>(() => {
    if (!tabs?.length) {
      return undefined;
    }

    return tabs.map((item) => {
      const tab: AppHeaderTab = {
        id: item.id,
        label: item.label,
        disabled: tabsDisabled,
        'data-test-subj': item.testSubj,
        isSelected: item.route ? pathname === item.route : false,
        href: item.route ? createHref(item.route) : undefined,
        onClick: item.onClick,
      };

      if (item.betaTooltip) {
        tab.badge = { iconType: 'flask', tooltip: item.betaTooltip };
      }

      return tab;
    });
  }, [tabs, tabsDisabled, createHref, pathname]);

  const back = useMemo(
    () =>
      getMonitoringBack(pathname, createHref, {
        hasClusterListing,
      }),
    [pathname, createHref, hasClusterListing]
  );

  const menu = useMemo<AppHeaderMenu>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [];

    if (supported) {
      items.push({
        id: 'setupMode',
        label: enabled
          ? i18n.translate('xpack.monitoring.setupMode.exit', {
              defaultMessage: 'Exit setup mode',
            })
          : i18n.translate('xpack.monitoring.setupMode.enter', {
              defaultMessage: 'Enter setup mode',
            }),
        iconType: enabled ? 'logOut' : 'pencil',
        testId: enabled ? 'exitSetupModeBtn' : 'monitoringSetupModeBtn',
        isSelected: enabled,
        run: () => {
          const nextEnabled = !enabled;
          toggleSetupMode(nextEnabled);
          trackStat({
            metric: `${TELEMETRY_METRIC_BUTTON_CLICK}setupmode_${nextEnabled ? 'enter' : 'exit'}`,
            metricType: METRIC_TYPE.CLICK,
          });
        },
      });
    }

    return {
      items,
      primaryActionItem: {
        id: 'alertsAndRules',
        label: i18n.translate('xpack.monitoring.alerts.dropdown.button', {
          defaultMessage: 'Alerts and rules',
        }),
        iconType: 'bell',
        items: [
          {
            id: 'createDefaultRules',
            label: i18n.translate('xpack.monitoring.alerts.dropdown.createAlerts', {
              defaultMessage: 'Create default rules',
            }),
            iconType: 'bell',
            run: () => {
              setShouldShowAlertsModal(true);
            },
          },
          {
            id: 'manageRules',
            label: i18n.translate('xpack.monitoring.alerts.dropdown.manageRules', {
              defaultMessage: 'Manage rules',
            }),
            iconType: 'tableOfContents',
            run: () => {
              services.application.navigateToApp('rules');
            },
          },
        ],
      },
    };
  }, [supported, enabled, services.application, trackStat]);

  const closeAlertsModal = () => {
    setShouldShowAlertsModal(false);
  };

  return (
    <EuiPageTemplate
      offset={0}
      restrictWidth={false}
      grow={false}
      data-test-subj="monitoringAppContainer"
    >
      <EuiPageTemplate.Section>
        <AppHeader
          title={pageTitle || title}
          tabs={headerTabs}
          back={back}
          menu={menu}
          spacing="bleed"
        />
        <EuiSpacer size="m" />
        <MonitoringToolbar onRefresh={onRefresh} />
        {shouldShowAutoOpsPromotion && (
          <>
            <EuiSpacer size="m" />
            <AutoOpsPromotionCallout
              cloudConnectUrl={cloudConnectUrl}
              onConnectClick={handleConnectClick}
              hasCloudConnectPermission={hasCloudConnectPermission}
              compressed={false}
            />
          </>
        )}
        {shouldShowAutoOpsEnabledBanner && (
          <>
            <EuiSpacer size="m" />
            <AutoOpsEnabledCallout
              autoOpsUrl={cloudConnectStatus.autoOpsServiceUrl}
              docsUrl={cloudConnectStatus.autoOpsDocsUrl}
              compressed={false}
            />
          </>
        )}
        <EuiSpacer size="m" />

        <EuiPage paddingSize="m">
          <EuiPageBody>{renderContent()}</EuiPageBody>
        </EuiPage>
      </EuiPageTemplate.Section>
      {shouldShowAlertsModal ? (
        <WatcherMigrationStep
          closeModal={closeAlertsModal}
          createButtonClick={() => {
            alertsEnableModalProvider.enableAlerts();
            closeAlertsModal();
          }}
        />
      ) : null}
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
