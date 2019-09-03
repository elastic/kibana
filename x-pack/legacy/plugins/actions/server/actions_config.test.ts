/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isErr } from './builtin_action_types/lib/result_type';
import {
  ActionsKibanaConfig,
  getActionsConfigurationUtilities,
  WhitelistedHosts,
} from './actions_config';

function unsafeGet<T, E>(result: Result<T, E>): T {
  if (isErr(result)) {
    throw new Error(`${result.error}`);
  }
  return result.value;
}

describe('isWhitelistedHostname', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: WhitelistedHosts.Any };
    expect(
      unsafeGet(
        getActionsConfigurationUtilities(config).isWhitelistedHostname(
          'https://github.com/elastic/kibana'
        )
      )
    ).toEqual('https://github.com/elastic/kibana');
  });

  test('returns false when the hostname in the requested uri is not in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: [] };
    expect(() =>
      unsafeGet(
        getActionsConfigurationUtilities(config).isWhitelistedHostname(
          'https://github.com/elastic/kibana'
        )
      )
    ).toThrowErrorMatchingInlineSnapshot(`"target url not in whitelist"`);
  });

  test('returns true when the hostname in the requested uri is in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: ['github.com'] };
    expect(
      unsafeGet(
        getActionsConfigurationUtilities(config).isWhitelistedHostname(
          'https://github.com/elastic/kibana'
        )
      )
    ).toEqual('https://github.com/elastic/kibana');
  });
});
