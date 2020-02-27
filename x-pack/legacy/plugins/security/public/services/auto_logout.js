/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';

const module = uiModules.get('security');

const getNextParameter = () => {
  const { location } = window;
  const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
  return `&next=${next}`;
};

const getProviderParameter = tenant => {
  const key = `${tenant}/session_provider`;
  const providerName = sessionStorage.getItem(key);
  return providerName ? `&provider=${encodeURIComponent(providerName)}` : '';
};

module.service('autoLogout', ($window, Promise) => {
  return () => {
    const logoutUrl = chrome.getInjected('logoutUrl');
    const tenant = `${chrome.getInjected('session.tenant', '')}`;
    const next = getNextParameter();
    const provider = getProviderParameter(tenant);
    $window.location.href = `${logoutUrl}?msg=SESSION_EXPIRED${next}${provider}`;
    return Promise.halt();
  };
});
