/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { WithHeaderLayout } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { PackForm } from '../../../packs/form';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';

const AddPackPageComponent = () => {
  useBreadcrumbs('pack_add');
  const packListProps = useRouterNavigate('packs');

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...packListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.addPack.viewPacksListTitle"
              defaultMessage="View all packs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage id="xpack.osquery.addPack.pageTitle" defaultMessage="Add pack" />
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [packListProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      <PackForm />
    </WithHeaderLayout>
  );
};

export const AddPackPage = React.memo(AddPackPageComponent);
