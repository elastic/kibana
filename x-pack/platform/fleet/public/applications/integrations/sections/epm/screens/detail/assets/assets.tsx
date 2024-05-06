/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState, useCallback } from 'react';
import { Redirect } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiTitle, EuiCallOut } from '@elastic/eui';

import type {
  EsAssetReference,
  AssetSOObject,
  SimpleSOAssetType,
} from '../../../../../../../../common';
import { allowedAssetTypes } from '../../../../../../../../common/constants';

import { Error, ExtensionWrapper, Loading } from '../../../../../components';

import type { PackageInfo } from '../../../../../types';
import { ElasticsearchAssetType, InstallStatus } from '../../../../../types';

import {
  useGetPackageInstallStatus,
  useLink,
  useStartServices,
  useUIExtension,
  useAuthz,
} from '../../../../../hooks';

import { sendGetBulkAssets } from '../../../../../hooks';

import { DeferredAssetsSection } from './deferred_assets_accordion';

import { AssetsAccordion } from './assets_accordion';

interface AssetsPanelProps {
  packageInfo: PackageInfo;
  refetchPackageInfo: () => void;
}

export const AssetsPage = ({ packageInfo, refetchPackageInfo }: AssetsPanelProps) => {
  const { name, version } = packageInfo;

  const pkgkey = `${name}-${version}`;
  const { spaces, docLinks } = useStartServices();
  const customAssetsExtension = useUIExtension(packageInfo.name, 'package-detail-assets');

  const canReadPackageSettings = useAuthz().integrations.readPackageInfo;

  const { getPath } = useLink();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const packageInstallStatus = getPackageInstallStatus(packageInfo.name);

  // assume assets are installed in this space until we find otherwise
  const [assetsInstalledInCurrentSpace, setAssetsInstalledInCurrentSpace] = useState<boolean>(true);
  const [assetSavedObjects, setAssetsSavedObjects] = useState<undefined | SimpleSOAssetType[]>();
  const [deferredInstallations, setDeferredInstallations] = useState<EsAssetReference[]>();

  const [fetchError, setFetchError] = useState<undefined | Error>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const forceRefreshAssets = useCallback(() => {
    if (refetchPackageInfo) {
      refetchPackageInfo();
    }
  }, [refetchPackageInfo]);

  useEffect(() => {
    const fetchAssetSavedObjects = async () => {
      if ('installationInfo' in packageInfo) {
        if (spaces) {
          const { id: spaceId } = await spaces.getActiveSpace();
          const assetInstallSpaceId = packageInfo.installationInfo?.installed_kibana_space_id;

          // if assets are installed in a different space no need to attempt to load them.
          if (assetInstallSpaceId && assetInstallSpaceId !== spaceId) {
            setAssetsInstalledInCurrentSpace(false);
            setIsLoading(false);
            return;
          }
        }

        const pkgInstallationInfo = packageInfo.installationInfo;

        if (
          pkgInstallationInfo?.installed_es &&
          Array.isArray(pkgInstallationInfo.installed_es) &&
          pkgInstallationInfo.installed_es.length > 0
        ) {
          const deferredAssets = pkgInstallationInfo.installed_es.filter(
            (asset) => asset.deferred === true
          );
          setDeferredInstallations(deferredAssets);
        }
        const authorizedTransforms = (pkgInstallationInfo?.installed_es || []).filter(
          (asset) => asset.type === ElasticsearchAssetType.transform && !asset.deferred
        );

        if (
          authorizedTransforms?.length === 0 &&
          (!pkgInstallationInfo?.installed_kibana ||
            pkgInstallationInfo.installed_kibana.length === 0)
        ) {
          setIsLoading(false);
          return;
        }
        try {
          const assetIds: AssetSOObject[] = [
            ...authorizedTransforms,
            ...(pkgInstallationInfo?.installed_kibana || []),
          ].map(({ id, type }) => ({
            id,
            type,
          }));

          const response = await sendGetBulkAssets({ assetIds });
          setAssetsSavedObjects(response.data?.items);
        } catch (e) {
          setFetchError(e);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    fetchAssetSavedObjects();
  }, [packageInfo, spaces]);

  // if they arrive at this page and the package is not installed, send them to overview
  // this happens if they arrive with a direct url or they uninstall while on this tab
  if (packageInstallStatus.status !== InstallStatus.installed) {
    return <Redirect to={getPath('integration_details_overview', { pkgkey })} />;
  }

  const showDeferredInstallations =
    Array.isArray(deferredInstallations) && deferredInstallations.length > 0;
  let content: JSX.Element | Array<JSX.Element | null> | null;
  if (isLoading) {
    content = <Loading />;
  } else if (!canReadPackageSettings) {
    content = (
      <EuiCallOut
        color="warning"
        title={
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.assets.assetsPermissionErrorTitle"
            defaultMessage="Permission error"
          />
        }
      >
        <FormattedMessage
          id="xpack.fleet.epm.packageDetails.assets.assetsPermissionError"
          defaultMessage="You do not have permission to retrieve the Kibana saved object for that integration. Contact your administrator."
        />
      </EuiCallOut>
    );
  } else if (fetchError) {
    content = (
      <Error
        title={
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.assets.fetchAssetsErrorTitle"
            defaultMessage="Error loading assets"
          />
        }
        error={fetchError}
      />
    );
  } else if (!assetsInstalledInCurrentSpace) {
    content = (
      <EuiCallOut
        heading="h2"
        title={
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.assets.assetsNotAvailableInCurrentSpaceTitle"
            defaultMessage="Assets not available in this space"
          />
        }
      >
        <p>
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.assets.assetsNotAvailableInCurrentSpaceBody"
            defaultMessage="This integration is installed, but no assets are available in this space. {learnMoreLink}."
            values={{
              learnMoreLink: (
                <EuiLink href={docLinks.links.fleet.installAndUninstallIntegrationAssets} external>
                  <FormattedMessage
                    id="xpack.fleet.epm.packageDetails.assets.assetsNotAvailableInCurrentSpace.learnMore"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
    );
  } else if (assetSavedObjects === undefined || assetSavedObjects.length === 0) {
    if (customAssetsExtension) {
      // If a UI extension for custom asset entries is defined, render the custom component here despite
      // there being no saved objects found
      content = (
        <ExtensionWrapper>
          <customAssetsExtension.Component />
        </ExtensionWrapper>
      );
    } else {
      content = !showDeferredInstallations ? (
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.fleet.epm.packageDetails.assets.noAssetsFoundLabel"
              defaultMessage="No assets found"
            />
          </h2>
        </EuiTitle>
      ) : null;
    }
  } else {
    content = [
      ...allowedAssetTypes.map((assetType) => {
        const sectionAssetSavedObjects = assetSavedObjects.filter((so) => so.type === assetType);

        if (!sectionAssetSavedObjects.length) {
          return null;
        }

        return (
          <Fragment key={assetType}>
            <AssetsAccordion
              savedObjects={sectionAssetSavedObjects}
              type={assetType}
              key={assetType}
            />
            <EuiSpacer size="l" />
          </Fragment>
        );
      }),
      // Ensure we add any custom assets provided via UI extension to the end of the list of other assets
      customAssetsExtension ? (
        <ExtensionWrapper>
          <customAssetsExtension.Component />
        </ExtensionWrapper>
      ) : null,
    ];
  }
  const deferredInstallationsContent = showDeferredInstallations ? (
    <>
      <DeferredAssetsSection
        deferredInstallations={deferredInstallations}
        packageInfo={packageInfo}
        forceRefreshAssets={forceRefreshAssets}
      />
      <EuiSpacer size="m" />
    </>
  ) : null;

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1} />
      <EuiFlexItem grow={6}>
        {deferredInstallationsContent}
        {content}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
