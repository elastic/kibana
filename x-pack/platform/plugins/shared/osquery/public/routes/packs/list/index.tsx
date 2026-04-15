/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSkeletonText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { WithHeaderLayout, fullWidthContentCss } from '../../../components/layouts';
import { PacksTable as PacksTableLegacy } from '../../../packs/packs_table';
import { AddPackButton } from '../../../packs/add_pack_button';
import { LoadIntegrationAssetsButton } from './load_integration_assets';
import { PacksTableEmptyState } from './empty_state';
import { useAssetsStatus } from '../../../assets/use_assets_status';
import { usePacks } from '../../../packs/use_packs';
import { useIsExperimentalFeatureEnabled } from '../../../common/experimental_features_context';
import { useKibana } from '../../../common/lib/kibana';
import { PacksTable } from './packs_table';

const PacksPageComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const queryHistoryRework = useIsExperimentalFeatureEnabled('queryHistoryRework');
  const { data: assetsData, isLoading: isLoadingAssetsStatus } = useAssetsStatus();
  const { data: packsData, isLoading: isLoadingPacks } = usePacks({
    skip: queryHistoryRework,
  });
  const showEmptyState = useMemo(
    () => !packsData?.total && assetsData?.install?.length,
    [assetsData?.install?.length, packsData?.total]
  );

  if (queryHistoryRework) {
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
  }

  const LeftColumn = (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiText>
          <h1>
            <FormattedMessage id="xpack.osquery.packList.pageTitle" defaultMessage="Packs" />
          </h1>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.osquery.packList.pageSubtitle"
              defaultMessage="Create packs to organize sets of queries and to schedule queries for agent policies."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const RightColumn = (
    <EuiFlexGroup direction="row" gutterSize="m">
      <EuiFlexItem>
        <LoadIntegrationAssetsButton fill={!!showEmptyState} />
      </EuiFlexItem>
      <EuiFlexItem>
        <AddPackButton fill={!showEmptyState} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const Content = (() => {
    if (isLoadingAssetsStatus || isLoadingPacks) {
      return <EuiSkeletonText lines={10} />;
    }

    if (showEmptyState) {
      return <PacksTableEmptyState />;
    }

    return <PacksTableLegacy />;
  })();

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumn={RightColumn} rightColumnGrow={false}>
      {Content}
    </WithHeaderLayout>
  );
};

export const PacksPage = React.memo(PacksPageComponent);
