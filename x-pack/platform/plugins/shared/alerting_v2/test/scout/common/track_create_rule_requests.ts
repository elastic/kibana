/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { RULE_API_PATH, RULE_TEMPLATE_API_PATH } from './constants';

const CREATE_REQUEST_PATTERN = new RegExp(`${RULE_API_PATH}/?$`);
const INSTALL_REQUEST_PATTERN = new RegExp(`${RULE_TEMPLATE_API_PATH}/[^/]+/_install/?$`);

export interface CreateRuleRequests {
  /** URLs of `POST` requests to the regular create rule API. */
  createRequestUrls: string[];
  /** URLs of `POST` requests to the rule template install API. */
  installRequestUrls: string[];
}

/**
 * Records every request the page makes to create a rule, split by API, so a
 * spec can assert which one a UI flow used: the regular create API for rules
 * authored outside the rule library, or the rule template install API for
 * rules created from a template. Start tracking before the action under test.
 */
export const trackCreateRuleRequests = (page: ScoutPage): CreateRuleRequests => {
  const requests: CreateRuleRequests = { createRequestUrls: [], installRequestUrls: [] };

  page.on('request', (request) => {
    if (request.method() !== 'POST') return;

    const { pathname } = new URL(request.url());
    if (CREATE_REQUEST_PATTERN.test(pathname)) {
      requests.createRequestUrls.push(request.url());
    } else if (INSTALL_REQUEST_PATTERN.test(pathname)) {
      requests.installRequestUrls.push(request.url());
    }
  });

  return requests;
};
