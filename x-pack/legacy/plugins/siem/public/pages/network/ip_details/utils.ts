/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Breadcrumb } from 'ui/chrome';

import { decodeIpv6 } from '../../../lib/helpers';
import { getNetworkUrl } from '../../../components/link_to/redirect_to_network';

import { networkModel, networkSelectors } from '../../../store/network';
import { State } from '../../../store';

import * as i18n from '../translations';

export const type = networkModel.NetworkType.details;

export const makeMapStateToProps = () => {
  const getNetworkFilterQuery = networkSelectors.networkFilterQueryAsJson();
  const getIpDetailsFlowTargetSelector = networkSelectors.ipDetailsFlowTargetSelector();
  return (state: State) => ({
    filterQuery: getNetworkFilterQuery(state, networkModel.NetworkType.details) || '',
    flowTarget: getIpDetailsFlowTargetSelector(state),
  });
};

export const getBreadcrumbs = (ip: string | undefined, search: string[]): Breadcrumb[] => {
  const breadcrumbs = [
    {
      text: i18n.PAGE_TITLE,
      href: `${getNetworkUrl()}${search && search[0] ? search[0] : ''}`,
    },
  ];
  if (ip) {
    return [
      ...breadcrumbs,
      {
        text: decodeIpv6(ip),
        href: '',
      },
    ];
  } else {
    return breadcrumbs;
  }
};
