/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { Breadcrumb } from 'ui/chrome';
import { StaticIndexPattern } from 'ui/index_patterns';

import { ESTermQuery } from '../../../../common/typed_json';

import { hostsModel, hostsSelectors } from '../../../store/hosts';
import { HostsTableType } from '../../../store/hosts/model';
import { State } from '../../../store';
import { getHostsUrl, getHostDetailsUrl } from '../../../components/link_to/redirect_to_hosts';

import * as i18n from '../translations';
import { convertKueryToElasticSearchQuery, escapeQueryValue } from '../../../lib/keury';
import { RouteSpyState } from '../../../utils/route/types';

export const type = hostsModel.HostsType.details;

export const makeMapStateToProps = () => {
  const getHostsFilterQuery = hostsSelectors.hostsFilterQueryExpression();
  return (state: State) => ({
    filterQueryExpression: getHostsFilterQuery(state, type) || '',
  });
};

const TabNameMappedToI18nKey = {
  [HostsTableType.hosts]: i18n.NAVIGATION_ALL_HOSTS_TITLE,
  [HostsTableType.authentications]: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
  [HostsTableType.uncommonProcesses]: i18n.NAVIGATION_UNCOMMON_PROCESSES_TITLE,
  [HostsTableType.anomalies]: i18n.NAVIGATION_ANOMALIES_TITLE,
  [HostsTableType.events]: i18n.NAVIGATION_EVENTS_TITLE,
};

export const getBreadcrumbs = (params: RouteSpyState, search: string[]): Breadcrumb[] => {
  let breadcrumb = [
    {
      text: i18n.PAGE_TITLE,
      href: `${getHostsUrl()}${search && search[0] ? search[0] : ''}`,
    },
  ];
  if (params.detailName != null) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.detailName,
        href: `${getHostDetailsUrl(params.detailName)}${search && search[1] ? search[1] : ''}`,
      },
    ];
  }
  if (params.tabName != null) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: TabNameMappedToI18nKey[params.tabName],
        href: '',
      },
    ];
  }
  return breadcrumb;
};

export const getFilterQuery = (
  hostName: string | null,
  filterQueryExpression: string,
  indexPattern: StaticIndexPattern
): ESTermQuery | string =>
  isEmpty(filterQueryExpression)
    ? hostName
      ? { term: { 'host.name': hostName } }
      : ''
    : convertKueryToElasticSearchQuery(
        `${filterQueryExpression} ${
          hostName ? `and host.name: ${escapeQueryValue(hostName)}` : ''
        }`,
        indexPattern
      );
