/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { WithHeaderLayout, fullWidthFormContentCss } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { PackForm } from '../../../packs/form';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { useIsExperimentalFeatureEnabled } from '../../../common/experimental_features_context';

const AddPackPageComponent = () => {
  const isHistoryEnabled = useIsExperimentalFeatureEnabled('queryHistoryRework');
  useBreadcrumbs('pack_add');
  const packListProps = useRouterNavigate('packs');

  const backLink = useMemo(
    () => (
      <EuiButtonEmpty iconType="chevronSingleLeft" {...packListProps} flush="left" size="xs">
        <FormattedMessage
          id="xpack.osquery.addPack.viewPacksListTitle"
          defaultMessage="View all packs"
        />
      </EuiButtonEmpty>
    ),
    [packListProps]
  );

  if (isHistoryEnabled) {
    return (
      <div css={fullWidthFormContentCss}>
        <EuiSpacer size="l" />
        {backLink}
        <EuiSpacer size="m" />
        <EuiText>
          <h1>
            <FormattedMessage id="xpack.osquery.addPack.pageTitle" defaultMessage="Add pack" />
          </h1>
        </EuiText>
        <EuiSpacer size="l" />
        <PackForm />
      </div>
    );
  }

  const LeftColumn = (
    <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
      <EuiFlexItem>{backLink}</EuiFlexItem>
      <EuiFlexItem>
        <EuiText>
          <h1>
            <FormattedMessage id="xpack.osquery.addPack.pageTitle" defaultMessage="Add pack" />
          </h1>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      <PackForm />
    </WithHeaderLayout>
  );
};

export const AddPackPage = React.memo(AddPackPageComponent);
