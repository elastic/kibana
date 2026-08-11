/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { triggersActionsRoute, getRuleDetailsRoute } from '@kbn/rule-data-utils';

import type { AssetSOObject, KibanaAssetReference, SimpleSOAssetType } from '../../../../common';
import { KibanaSavedObjectType } from '../../../../common/types/models';

import type { PackageInfo } from '../../../types';

import { useFleetStatus, useStartServices } from '../../../hooks';
import { sendGetBulkAssets } from '../../../hooks';

import { ALERTING_ASSET_TYPES } from '../sections/epm/screens/detail/alerting';

type AlertingAssetsByType = Record<string, KibanaAssetReference[]>;

type AssetSavedObjectsByType = Record<
  string,
  Record<string, SimpleSOAssetType & { appLink?: string }>
>;

type UserCreatedRule = SimpleSOAssetType & { appLink?: string };

export const useAlertingAssets = (packageInfo: PackageInfo) => {
  const { spaceId } = useFleetStatus();
  const { http } = useStartServices();

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
      alertingAssets.reduce<AlertingAssetsByType>((acc, asset) => {
        if (!acc[asset.type]) {
          acc[asset.type] = [];
        }
        acc[asset.type].push(asset);
        return acc;
      }, {}),
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

  const {
    data,
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery<
    { assetSavedObjectsByType: AssetSavedObjectsByType; userCreatedRules: UserCreatedRule[] },
    Error
  >({
    queryKey: ['alerting-assets', packageInfo.name, packageInfo.version, alertingAssets],
    queryFn: async () => {
      let assetsByType: AssetSavedObjectsByType = {};

      if (alertingAssets.length > 0) {
        const assetIds: AssetSOObject[] = alertingAssets.map(({ id, type }) => ({ id, type }));
        const { data: bulkData, error } = await sendGetBulkAssets({ assetIds });

        if (error) {
          throw error;
        }

        assetsByType = (bulkData?.items || []).reduce<AssetSavedObjectsByType>((acc, asset) => {
          if (!acc[asset.type]) {
            acc[asset.type] = {};
          }
          acc[asset.type][asset.id] = asset;
          return acc;
        }, {});
      }

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

      const fleetManagedRuleIds = new Set(
        alertingAssets.filter((a) => a.type === KibanaSavedObjectType.alert).map((a) => a.id)
      );

      const externalRules: UserCreatedRule[] = (rulesRes.data || [])
        .filter((rule) => !fleetManagedRuleIds.has(rule.id))
        .map((rule) => ({
          id: rule.id,
          type: KibanaSavedObjectType.alert as SimpleSOAssetType['type'],
          attributes: { title: rule.name },
          appLink: `${triggersActionsRoute}${getRuleDetailsRoute(encodeURIComponent(rule.id))}`,
        }));

      return { assetSavedObjectsByType: assetsByType, userCreatedRules: externalRules };
    },
    enabled: !!pkgInstallationInfo,
    refetchOnWindowFocus: false,
  });

  return {
    alertingAssets,
    alertingAssetsByType,
    deferredAlerts,
    assetSavedObjectsByType: data?.assetSavedObjectsByType ?? {},
    userCreatedRules: data?.userCreatedRules ?? [],
    isLoading,
    fetchError,
    refetch,
  };
};
