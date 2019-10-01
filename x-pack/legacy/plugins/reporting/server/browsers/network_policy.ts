/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as _ from 'lodash';
import { parse } from 'url';

type filterList = string[];
type allowBy = (filterBy: string) => boolean;

// Note we allow wildcards (*) in these
const IP_REG = /(?:[0-9*]{1,3}\.){3}[0-9*]{1,3}$/;

const isIp = (filter: string) => IP_REG.test(filter);
const isProtocol = (filter: string) => filter.endsWith(':');

const ipMatchFilter = (ip: string, filter: string) => {
  const ipParts = ip.split('.');
  const filterParts = filter.split('.');

  return _.every(ipParts, (part, idx) => filterParts[idx] === part || filterParts[idx] === '*');
};

const isAllowed = (allowBy: allowBy, allowList: filterList, denyList: filterList) => {
  return (!allowList.length || _.some(allowList, allowBy)) && !_.some(denyList, allowBy);
};

const allowProtocol = (url: string, allowList: filterList, denyList: filterList) => {
  const allowBy: allowBy = filterPattern => url.startsWith(filterPattern);
  return isAllowed(allowBy, allowList, denyList);
};

const allowIp = (ip: string, allowList: filterList, denyList: filterList) => {
  const allowBy: allowBy = (filterPattern: string) => ipMatchFilter(ip, filterPattern);
  return isAllowed(allowBy, allowList, denyList);
};

const allowUrl = (url: string, allowList: filterList, denyList: filterList) => {
  const { host } = parse(url);

  const allowBy: allowBy = filter => (host || '').endsWith(filter);
  return isAllowed(allowBy, allowList, denyList);
};

export const allowResponse = (
  url: string,
  ip: string,
  allowList: filterList,
  denyList: filterList
) => {
  if (!allowList.length && !denyList.length) {
    return true;
  }

  let isProtocolOk = true;
  let isIPOk = true;
  let isHostOK = true;

  const protocolAllowFilters = _.filter(allowList, isProtocol);
  const protocolDenyFilters = _.filter(denyList, isProtocol);

  const ipAllowFilters = _.filter(allowList, isIp);
  const ipDenyFilters = _.filter(denyList, isIp);

  const hostAllowFilters = _.difference(allowList, [...protocolAllowFilters, ...ipAllowFilters]);
  const hostDenyFilters = _.difference(denyList, [...protocolDenyFilters, ...ipDenyFilters]);

  if (protocolAllowFilters.length || protocolDenyFilters.length) {
    isProtocolOk = allowProtocol(url, protocolAllowFilters, protocolDenyFilters);
  }

  if (ipAllowFilters.length || ipDenyFilters.length) {
    isIPOk = allowIp(ip, allowList, denyList);
  }

  if (hostAllowFilters.length || hostDenyFilters.length) {
    isHostOK = allowUrl(url, allowList, denyList);
  }

  return isProtocolOk && isIPOk && isHostOK;
};
