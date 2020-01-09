/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { docCountQuery } from '../../../queries';
import { EmptyStateError } from './empty_state_error';
import { EmptyStateLoading } from './empty_state_loading';
import { StatesIndexStatus } from '../../../../common/graphql/types';
import { DataMissing } from './data_missing';

interface EmptyStateQueryResult {
  statesIndexStatus?: StatesIndexStatus;
}

interface EmptyStateProps {
  basePath: string;
  children: JSX.Element[] | JSX.Element;
}

type Props = UptimeGraphQLQueryProps<EmptyStateQueryResult> & EmptyStateProps;

export const EmptyStateComponent = ({ basePath, children, data, errors }: Props) => {
  if (errors) {
    return <EmptyStateError errors={errors} />;
  }
  if (data && data.statesIndexStatus) {
    const { indexExists, docCount } = data.statesIndexStatus;
    if (!indexExists) {
      return (
        <DataMissing
          basePath={basePath}
          headingMessage={i18n.translate('xpack.uptime.emptyState.noIndexTitle', {
            defaultMessage: 'Uptime index not found',
          })}
        />
      );
    } else if (indexExists && docCount && docCount.count === 0) {
      return (
        <DataMissing
          basePath={basePath}
          headingMessage={i18n.translate('xpack.uptime.emptyState.noDataMessage', {
            defaultMessage: 'No uptime data found',
          })}
        />
      );
    }
    /**
     * We choose to render the children any time the count > 0, even if
     * the component is loading. If we render the loading state for this component,
     * it will blow away the state of child components and trigger an ugly
     * jittery UX any time the components refresh. This way we'll keep the stale
     * state displayed during the fetching process.
     */
    return <Fragment>{children}</Fragment>;
  }
  return <EmptyStateLoading />;
};

export const EmptyState = withUptimeGraphQL<EmptyStateQueryResult, EmptyStateProps>(
  EmptyStateComponent,
  docCountQuery
);
