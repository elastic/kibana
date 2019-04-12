/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import compose from 'lodash/fp/compose';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

import { LoadingPage } from '../../components/loading_page';
import { replaceLogFilterInQueryString } from '../../containers/logs/with_log_filter';
import { replaceLogPositionInQueryString } from '../../containers/logs/with_log_position';
import { WithSource } from '../../containers/with_source';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';

type RedirectToLogsType = RouteComponentProps<{}>;

interface RedirectToLogsProps extends RedirectToLogsType {
  intl: InjectedIntl;
}

export const RedirectToLogs = injectI18n(({ location, intl }: RedirectToLogsProps) => (
  <WithSource>
    {({ configuration, isLoading }) => {
      if (isLoading) {
        return (
          <LoadingPage
            message={intl.formatMessage({
              id: 'xpack.infra.redirectToLogs.loadingLogsMessage',
              defaultMessage: 'Loading logs',
            })}
          />
        );
      }

      if (!configuration) {
        return null;
      }

      const filter = getFilterFromLocation(location);
      const searchString = compose(
        replaceLogFilterInQueryString(filter),
        replaceLogPositionInQueryString(getTimeFromLocation(location))
      )('');
      return <Redirect to={`/logs?${searchString}`} />;
    }}
  </WithSource>
));
