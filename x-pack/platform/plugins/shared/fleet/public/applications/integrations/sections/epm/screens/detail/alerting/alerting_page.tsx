/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState, useCallback, useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type {
  AssetSOObject,
  KibanaAssetReference,
  SimpleSOAssetType,
} from '../../../../../../../../common';
import { KibanaSavedObjectType } from '../../../../../../../../common/types/models';

import { Error, Loading } from '../../../../../components';

import type { PackageInfo } from '../../../../../types';
import { InstallStatus } from '../../../../../types';

import {
  useGetPackageInstallStatus,
  useLink,
  useAuthz,
  useFleetStatus,
  useStartServices,
} from '../../../../../hooks';
import { ExperimentalFeaturesService } from '../../../../../services';
import { sendGetBulkAssets, sendRequestInstallRuleAssets } from '../../../../../hooks';
import { SideBarColumn } from '../../../components/side_bar_column';

import { AssetsAccordion } from '../assets/assets_accordion';
import { DeferredAssetsAccordion } from '../assets/deferred_assets_accordion';

const ALERTING_ASSET_TYPES: KibanaSavedObjectType[] = [
  KibanaSavedObjectType.alertingRuleTemplate,
  KibanaSavedObjectType.alert,
];

const getInactivityMonitoringTemplateId = (pkgName: string): string =>
  `fleet-${pkgName}-inactivity-monitoring`;

interface AlertingPageProps {
  packageInfo: PackageInfo;
  refetchPackageInfo: () => void;
}

export const AlertingPage = ({ packageInfo, refetchPackageInfo }: AlertingPageProps) => {
  const { name, version } = packageInfo;
  const pkgkey = `${name}-${version}`;

  const { spaceId } = useFleetStatus();
  const { notifications, http } = useStartServices();
  const authz = useAuthz();
  const canInstallPackages = authz.integrations?.installPackages;
  const canReadPackageSettings = authz.integrations.readPackageInfo;

  const { getPath } = useLink();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const packageInstallStatus = getPackageInstallStatus(packageInfo.name);

  const pkgInstallationInfo =
    'installationInfo' in packageInfo ? packageInfo.installationInfo : undefined;

  const installedSpaceId = pkgInstallationInfo?.installed_kibana_space_id;

  const kibanaAssets = useMemo(() => {
    return !installedSpaceId || installedSpaceId === spaceId
      ? pkgInstallationInfo?.installed_kibana || []
      : pkgInstallationInfo?.additional_spaces_installed_kibana?.[spaceId || 'default'] || [];
  }, [
    installedSpaceId,
    spaceId,
    pkgInstallationInfo?.installed_kibana,
    pkgInstallationInfo?.additional_spaces_installed_kibana,
  ]);

  const alertingAssets = useMemo(
    () => kibanaAssets.filter((asset) => ALERTING_ASSET_TYPES.includes(asset.type)),
    [kibanaAssets]
  );

  const alertingAssetsByType = useMemo(
    () =>
      alertingAssets.reduce((acc, asset) => {
        if (!acc[asset.type]) {
          acc[asset.type] = [];
        }
        acc[asset.type].push(asset);
        return acc;
      }, {} as Record<string, KibanaAssetReference[]>),
    [alertingAssets]
  );

  const deferredAlerts = useMemo(
    () =>
      alertingAssets.filter(
        (asset) =>
          asset.type === KibanaSavedObjectType.alert &&
          'deferred' in asset &&
          asset.deferred === true
      ),
    [alertingAssets]
  );

  const [assetSavedObjectsByType, setAssetsSavedObjectsByType] = useState<
    Record<string, Record<string, SimpleSOAssetType & { appLink?: string }>>
  >({});
  const [userCreatedRules, setUserCreatedRules] = useState<
    Array<SimpleSOAssetType & { appLink?: string }>
  >([]);
  const [fetchError, setFetchError] = useState<undefined | Error>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReinstalling, setIsReinstalling] = useState<boolean>(false);

  const forceRefreshAssets = useCallback(() => {
    if (refetchPackageInfo) {
      refetchPackageInfo();
    }
  }, [refetchPackageInfo]);

  useEffect(() => {
    let cancelled = false;

    const fetchAlertingAssets = async () => {
      if (!pkgInstallationInfo) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch Fleet-managed asset details
        if (alertingAssets.length > 0) {
          const assetIds: AssetSOObject[] = alertingAssets.map(({ id, type }) => ({
            id,
            type,
          }));

          const { data, error } = await sendGetBulkAssets({ assetIds });
          if (error) {
            setFetchError(error);
          } else if (!cancelled) {
            setAssetsSavedObjectsByType(
              (data?.items || []).reduce((acc, asset) => {
                if (!acc[asset.type]) {
                  acc[asset.type] = {};
                }
                acc[asset.type][asset.id] = asset;
                return acc;
              }, {} as typeof assetSavedObjectsByType)
            );
          }
        }

        // Fetch all rules tagged with this integration's title
        const { title } = packageInfo;
        const rulesRes = await http.get<{
          data: Array<{ id: string; name: string }>;
          total: number;
        }>('/api/alerting/rules/_find', {
          query: {
            filter: `alert.attributes.tags:"${title}"`,
            per_page: 1000,
            fields: '["name"]',
          },
        });

        if (!cancelled) {
          const fleetManagedRuleIds = new Set(
            alertingAssets.filter((a) => a.type === KibanaSavedObjectType.alert).map((a) => a.id)
          );

          const externalRules = (rulesRes.data || [])
            .filter((rule) => !fleetManagedRuleIds.has(rule.id))
            .map((rule) => ({
              id: rule.id,
              type: KibanaSavedObjectType.alert as SimpleSOAssetType['type'],
              attributes: { title: rule.name },
              appLink: `/app/management/insightsAndAlerting/triggersActions/rule/${rule.id}`,
            }));

          setUserCreatedRules(externalRules);
        }
      } catch (e) {
        if (!cancelled) {
          setFetchError(e);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    fetchAlertingAssets();

    return () => {
      cancelled = true;
    };
  }, [packageInfo, alertingAssets, pkgInstallationInfo, http]);

  // Detect missing inactivity monitoring template
  const { enableIntegrationInactivityAlerting } = ExperimentalFeaturesService.get();
  const hasDataStreams = (packageInfo.data_streams?.length ?? 0) > 0;
  const isIntegrationPackage = packageInfo.type === 'integration';
  const inactivityTemplateId = getInactivityMonitoringTemplateId(name);
  const hasInactivityTemplate = useMemo(
    () => alertingAssets.some((asset) => asset.id === inactivityTemplateId),
    [alertingAssets, inactivityTemplateId]
  );
  const showInactivityCallout =
    enableIntegrationInactivityAlerting &&
    isIntegrationPackage &&
    hasDataStreams &&
    !hasInactivityTemplate &&
    !isLoading;

  const handleReinstallAlertingAssets = useCallback(async () => {
    setIsReinstalling(true);
    notifications.toasts.addInfo(
      i18n.translate('xpack.fleet.epm.packageDetails.alerting.reinstallAcknowledged', {
        defaultMessage: 'Reinstalling alerting assets...',
      }),
      { toastLifeTimeMs: 500 }
    );

    try {
      await sendRequestInstallRuleAssets(name, version);

      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.epm.packageDetails.alerting.reinstallSuccess', {
          defaultMessage: 'Successfully reinstalled alerting assets.',
        }),
        { toastLifeTimeMs: 1000 }
      );
    } catch (e) {
      notifications.toasts.addError(e, {
        title: i18n.translate('xpack.fleet.epm.packageDetails.alerting.reinstallError', {
          defaultMessage: 'An error occurred reinstalling alerting assets.',
        }),
      });
    }

    forceRefreshAssets();
    setIsReinstalling(false);
  }, [notifications.toasts, name, version, forceRefreshAssets]);

  // Redirect to overview if not installed or not an integration package
  if (
    packageInstallStatus.status !== InstallStatus.installed ||
    packageInfo.type !== 'integration'
  ) {
    return <Redirect to={getPath('integration_details_overview', { pkgkey })} />;
  }

  const hasDeferredAlerts = deferredAlerts.length > 0;

  let content: JSX.Element | Array<JSX.Element | null> | null;
  if (isLoading) {
    content = <Loading />;
  } else if (!canReadPackageSettings) {
    content = (
      <EuiCallOut
        announceOnMount
        color="warning"
        title={
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.alerting.permissionErrorTitle"
            defaultMessage="Permission error"
          />
        }
      >
        <FormattedMessage
          id="xpack.fleet.epm.packageDetails.alerting.permissionError"
          defaultMessage="You do not have permission to retrieve the alerting assets for this integration. Contact your administrator."
        />
      </EuiCallOut>
    );
  } else if (alertingAssets.length === 0 && userCreatedRules.length === 0) {
    content = (
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.alerting.noAlertingAssetsLabel"
            defaultMessage="No alerting assets found"
          />
        </p>
      </EuiText>
    );
  } else {
    content = [
      ...ALERTING_ASSET_TYPES.map((assetType) => {
        const assets = alertingAssetsByType[assetType] || [];
        const soAssets = assetSavedObjectsByType[assetType] || {};
        const fleetManagedAssets = assets
          .filter((asset) => !('deferred' in asset && asset.deferred === true))
          .map((asset) => ({
            ...asset,
            ...soAssets[asset.id],
          }));

        const allAssets =
          assetType === KibanaSavedObjectType.alert
            ? [...fleetManagedAssets, ...userCreatedRules]
            : fleetManagedAssets;

        const sortedAssets = allAssets.sort((a, b) => {
          const titleA = a.attributes?.title ?? a.id;
          const titleB = b.attributes?.title ?? b.id;
          return titleA.localeCompare(titleB);
        });

        if (!sortedAssets.length) {
          return null;
        }

        return (
          <Fragment key={assetType}>
            <AssetsAccordion savedObjects={sortedAssets} type={assetType} key={assetType} />
            <EuiSpacer size="l" />
          </Fragment>
        );
      }),
    ];
  }

  return (
    <EuiFlexGroup alignItems="flexStart">
      <SideBarColumn grow={1} />
      <EuiFlexItem grow={7}>
        {fetchError && (
          <>
            <Error
              title={
                <FormattedMessage
                  id="xpack.fleet.epm.packageDetails.alerting.fetchErrorTitle"
                  defaultMessage="Error loading alerting asset information"
                />
              }
              error={fetchError}
            />
            <EuiSpacer size="m" />
          </>
        )}

        {showInactivityCallout && (
          <>
            <EuiCallOut
              announceOnMount
              color="primary"
              iconType="info"
              title={
                <FormattedMessage
                  id="xpack.fleet.epm.packageDetails.alerting.missingInactivityTemplateTitle"
                  defaultMessage="Idle data streams alerting available"
                />
              }
            >
              <FormattedMessage
                id="xpack.fleet.epm.packageDetails.alerting.missingInactivityTemplateDescription"
                defaultMessage="Reinstall alerting assets to add an alerting rule template for monitoring idle data streams."
              />
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        )}

        {hasDeferredAlerts && (
          <>
            <DeferredAssetsAccordion
              packageInfo={packageInfo}
              type={KibanaSavedObjectType.alert}
              deferredInstallations={deferredAlerts}
              forceRefreshAssets={forceRefreshAssets}
            />
            <EuiSpacer size="l" />
          </>
        )}

        {!isLoading && canInstallPackages && (
          <>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    <FormattedMessage
                      id="xpack.fleet.epm.packageDetails.alerting.reinstallTitle"
                      defaultMessage="Reinstall alerting assets"
                    />
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <FormattedMessage
                  id="xpack.fleet.epm.packageDetails.alerting.reinstallDescription"
                  defaultMessage="Reinstall alerting rule template assets for this integration."
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div>
                  <EuiButton
                    data-test-subj="fleetAlertingReinstallButton"
                    iconType="refresh"
                    isLoading={isReinstalling}
                    onClick={handleReinstallAlertingAssets}
                  >
                    <FormattedMessage
                      id="xpack.fleet.epm.packageDetails.alerting.reinstallButton"
                      defaultMessage="Reinstall alerting assets"
                    />
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
          </>
        )}

        {content}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
