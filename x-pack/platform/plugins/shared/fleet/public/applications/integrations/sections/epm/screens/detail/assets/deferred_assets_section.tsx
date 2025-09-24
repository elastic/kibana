/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';

import { EuiSpacer, EuiCallOut, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { useAuthz } from '../../../../../../../hooks';

import type { AssetReference, EsAssetReference } from '../../../../../../../../common';

import type { PackageInfo } from '../../../../../types';
import { ElasticsearchAssetType } from '../../../../../types';
import { KibanaSavedObjectType } from '../../../../../../../../common/types/models';

import { getDeferredInstallationMsg } from './deferred_assets_warning';
import { DeferredAssetsAccordion } from './deferred_assets_accordion';

interface Props {
  packageInfo: PackageInfo;
  deferredInstallations: AssetReference[];
  forceRefreshAssets?: () => void;
}

export const DeferredAssetsSection: FunctionComponent<Props> = ({
  deferredInstallations,
  packageInfo,
  forceRefreshAssets,
}) => {
  const authz = useAuthz();

  const deferredTransforms = deferredInstallations.filter(
    (asset) => asset.type === ElasticsearchAssetType.transform
  );

  const deferredAlerts = deferredInstallations.filter(
    (asset) => asset.type === KibanaSavedObjectType.alert
  );

  return (
    <>
      <EuiTitle>
        <h2>
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.assets.deferredInstallationsLabel"
            defaultMessage="Deferred installations"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiCallOut
        size="m"
        color="warning"
        iconType="alert"
        title={getDeferredInstallationMsg(deferredInstallations.length, { authz })}
      />
      <EuiSpacer size="l" />

      <DeferredAssetsAccordion
        packageInfo={packageInfo}
        type={ElasticsearchAssetType.transform}
        deferredInstallations={deferredTransforms as EsAssetReference[]}
        forceRefreshAssets={forceRefreshAssets}
      />

      <DeferredAssetsAccordion
        packageInfo={packageInfo}
        type={KibanaSavedObjectType.alert}
        deferredInstallations={deferredAlerts}
        forceRefreshAssets={forceRefreshAssets}
      />
    </>
  );
};
