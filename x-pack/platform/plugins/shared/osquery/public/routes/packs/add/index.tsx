/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { fullWidthFormContentCss } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { PackForm } from '../../../packs/form';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';

const AddPackPageComponent = () => {
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
};

export const AddPackPage = React.memo(AddPackPageComponent);
