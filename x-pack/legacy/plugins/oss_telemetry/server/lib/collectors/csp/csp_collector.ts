/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createCSPRuleString,
  DEFAULT_CSP_RULES,
} from '../../../../../../../../src/legacy/server/csp';
import { HapiServer } from '../../../../';

export function createCspCollector(server: HapiServer) {
  return {
    type: 'csp',
    isReady: () => true,
    async fetch() {
      const config = server.config();

      // It's important that we do not send the value of csp.rules here as it
      // can be customized with values that can be identifiable to given
      // installs, such as URLs
      const defaultRulesString = createCSPRuleString([...DEFAULT_CSP_RULES]);
      const actualRulesString = createCSPRuleString(config.get('csp.rules'));

      return {
        strict: config.get('csp.strict'),
        warnLegacyBrowsers: config.get('csp.warnLegacyBrowsers'),
        rulesChangedFromDefault: defaultRulesString !== actualRulesString,
      };
    },
  };
}

export function registerCspCollector(server: HapiServer): void {
  const { usage } = server;
  const collector = usage.collectorSet.makeUsageCollector(createCspCollector(server));
  usage.collectorSet.register(collector);
}
