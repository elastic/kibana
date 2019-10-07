/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as _ from 'lodash';
import * as url from 'url';

interface FirewallRequest {
  ip: string | null;
  url: string;
}

interface FirewallRule {
  allow: boolean;
  hosts?: string[];
  protocols?: string[];
  ips?: string[];
}

export const allowRequest = (request: FirewallRequest, rules: FirewallRule[]) => {
  const parsed = url.parse(request.url);

  if (!rules.length) {
    return true;
  }

  // Accumulator has three potential values here:
  // True => allow request, don't check other rules
  // False => reject request, don't check other rules
  // Undefined => Not yet known, proceed to next rule
  const allowed = rules.reduce((result: boolean | undefined, rule) => {
    if (typeof result === 'boolean') {
      return result;
    }

    const isHostMatch = rule.hosts
      ? _.some(rule.hosts, host => (parsed.host || '').endsWith(host))
      : false;

    const isProtocolMatch = rule.protocols
      ? _.some(rule.protocols, protocol => protocol === parsed.protocol)
      : false;

    const isIPMatch = rule.ips
      ? request.ip
        ? _.some(rule.ips, ip => ip === request.ip)
        : rule.allow
      : false;

    const isRuleMatch = isHostMatch || isProtocolMatch || isIPMatch;

    return rule.allow || isRuleMatch ? rule.allow && isRuleMatch : undefined;
  }, undefined);

  return typeof allowed === 'undefined' || allowed;
};
