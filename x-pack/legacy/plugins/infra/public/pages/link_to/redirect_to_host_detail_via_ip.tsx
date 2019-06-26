/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { replaceMetricTimeInQueryString } from '../../containers/metrics/with_metrics_time';
import { useHostIpToName } from './use_host_ip_to_name';
import { getFromFromLocation, getToFromLocation } from './query_params';
import { LoadingPage } from '../../components/loading_page';
import { Error } from '../error';
import { useSource } from '../../containers/source/source';

type RedirectToHostDetailType = RouteComponentProps<{
  hostIp: string;
}>;

interface RedirectToHostDetailProps extends RedirectToHostDetailType {
  intl: InjectedIntl;
}

export const RedirectToHostDetailViaIP = injectI18n(
  ({
    match: {
      params: { hostIp },
    },
    location,
    intl,
  }: RedirectToHostDetailProps) => {
    const { source } = useSource({ sourceId: 'default' });

    const { error, name } = useHostIpToName(
      hostIp,
      (source && source.configuration && source.configuration.metricAlias) || null
    );

    if (error) {
      return (
        <Error
          message={intl.formatMessage(
            {
              id: 'xpack.infra.linkTo.hostWithIp.error',
              defaultMessage: 'Host not found with IP address "{hostIp}".',
            },
            { hostIp }
          )}
        />
      );
    }

    const searchString = replaceMetricTimeInQueryString(
      getFromFromLocation(location),
      getToFromLocation(location)
    )('');

    if (name) {
      return <Redirect to={`/metrics/host/${name}?${searchString}`} />;
    }

    return (
      <LoadingPage
        message={intl.formatMessage(
          {
            id: 'xpack.infra.linkTo.hostWithIp.loading',
            defaultMessage: 'Loading host with IP address "{hostIp}".',
          },
          { hostIp }
        )}
      />
    );
  }
);
