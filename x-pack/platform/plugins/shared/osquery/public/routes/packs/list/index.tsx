/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText } from '@elastic/eui';
import React from 'react';

import { fullWidthContentCss } from '../../../components/layouts';
import { useAssetsStatus } from '../../../assets/use_assets_status';
import { useKibana } from '../../../common/lib/kibana';
import { PacksTable } from './packs_table';

const PacksPageComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const { data: assetsData, isLoading: isLoadingAssetsStatus } = useAssetsStatus();

  if (isLoadingAssetsStatus && permissions.writePacks) {
    return (
      <div css={fullWidthContentCss}>
        <EuiSkeletonText lines={10} />
      </div>
    );
  }

  return (
    <div css={fullWidthContentCss}>
      <PacksTable hasAssetsToInstall={!!assetsData?.install?.length} />
    </div>
  );
};

export const PacksPage = React.memo(PacksPageComponent);
