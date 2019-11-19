/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OperationVariables } from 'apollo-client';
import { GraphQLError } from 'graphql';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { withApollo, WithApolloClient } from 'react-apollo';
import { formatUptimeGraphQLErrorList } from '../../lib/helper/format_error_list';
import { UptimeRefreshContext } from '../../contexts';

export interface UptimeGraphQLQueryProps<T> {
  loading: boolean;
  data?: T;
  errors?: GraphQLError[];
}

interface UptimeGraphQLProps {
  implementsCustomErrorState?: boolean;
  variables: OperationVariables;
}

/**
 * This HOC abstracts the task of querying our GraphQL endpoint,
 * which eliminates the need for a lot of boilerplate code in the other components.
 *
 * @type T - the expected result's type
 * @type P - any props the wrapped component will require
 * @param WrappedComponent - the consuming component
 * @param query - the graphQL query
 */
export function withUptimeGraphQL<T, P = {}>(WrappedComponent: any, query: any) {
  type Props = UptimeGraphQLProps & WithApolloClient<T> & P;

  return withApollo((props: Props) => {
    const { lastRefresh } = useContext(UptimeRefreshContext);
    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<T | undefined>(undefined);
    const [errors, setErrors] = useState<GraphQLError[] | undefined>(undefined);
    let updateState = (
      loadingVal: boolean,
      dataVal: T | undefined,
      errorsVal: GraphQLError[] | undefined
    ) => {
      setLoading(loadingVal);
      setData(dataVal);
      setErrors(errorsVal);
    };
    const { client, implementsCustomErrorState, variables } = props;
    const fetch = () => {
      setLoading(true);
      client
        .query<T>({ fetchPolicy: 'network-only', query, variables })
        .then(
          (result: any) => {
            updateState(result.loading, result.data, result.errors);
          },
          (result: any) => {
            updateState(false, undefined, result.graphQLErrors);
          }
        );
    };
    useEffect(() => {
      fetch();

      /**
       * If the `then` handler in `fetch`'s promise is fired after
       * this component has unmounted, it will try to set state on an
       * unmounted component, which indicates a memory leak and will trigger
       * React warnings.
       *
       * We counteract this side effect by providing a cleanup function that will
       * reassign the update function to do nothing with the returned values.
       */
      return () => {
        updateState = () => {};
      };
    }, [variables, lastRefresh]);
    if (!implementsCustomErrorState && errors && errors.length > 0) {
      return <Fragment>{formatUptimeGraphQLErrorList(errors)}</Fragment>;
    }
    return <WrappedComponent {...props} loading={loading} data={data} errors={errors} />;
  });
}
