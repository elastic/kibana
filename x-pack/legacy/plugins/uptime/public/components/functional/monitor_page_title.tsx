/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTextColor, EuiTitle } from '@elastic/eui';
import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { MonitorPageTitle as TitleType } from '../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { monitorPageTitleQuery } from '../../queries';

interface MonitorPageTitleQueryResult {
  monitorPageTitle?: TitleType;
}

interface MonitorPageTitleProps {
  monitorId: string;
}

type Props = MonitorPageTitleProps & UptimeGraphQLQueryProps<MonitorPageTitleQueryResult>;

export const MonitorPageTitleComponent = ({ data }: Props) =>
  data && data.monitorPageTitle ? (
    <EuiTitle size="xxs">
      <EuiTextColor color="subdued">
        <h1 data-test-subj="monitor-page-title">{data.monitorPageTitle.id}</h1>
      </EuiTextColor>
    </EuiTitle>
  ) : (
    <EuiLoadingSpinner size="xl" />
  );

export const MonitorPageTitle = withUptimeGraphQL<
  MonitorPageTitleQueryResult,
  MonitorPageTitleProps
>(MonitorPageTitleComponent, monitorPageTitleQuery);
