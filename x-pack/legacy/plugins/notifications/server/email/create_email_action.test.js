/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EmailAction } from './email_action';
import {
  createEmailAction,
  defaultsFromConfig,
  optionsFromConfig,
} from './create_email_action';

describe('create_email_action', () => {

  test('optionsFromConfig uses config without modification',  () => {
    const get = key => {
      const suffixes = [
        'host',
        'port',
        'require_tls',
        'pool',
        'auth.username',
        'auth.password',
      ];
      const value = suffixes.find(suffix => {
        return `xpack.notifications.email.smtp.${suffix}` === key;
      });

      if (value === undefined) {
        throw new Error(`Unknown config key used ${key}`);
      }

      return value;
    };

    expect(optionsFromConfig({ get })).toEqual({
      host: 'host',
      port: 'port',
      requireTLS: 'require_tls',
      pool: 'pool',
      auth: {
        user: 'auth.username',
        pass: 'auth.password',
      },
    });
  });

  test('defaultsFromConfig uses config without modification', () => {
    const get = key => {
      const suffixes = [
        'from',
        'to',
        'cc',
        'bcc',
      ];
      const value = suffixes.find(suffix => {
        return `xpack.notifications.email.defaults.${suffix}` === key;
      });

      if (value === undefined) {
        throw new Error(`Unknown config key used ${key}`);
      }

      return value;
    };

    expect(defaultsFromConfig({ get })).toEqual({
      from: 'from',
      to: 'to',
      cc: 'cc',
      bcc: 'bcc',
    });
  });

  test('createEmailAction', async () => {
    const config = { };
    const server = { config: jest.fn().mockReturnValue(config) };
    const _options = jest.fn().mockReturnValue({ options: true });
    const defaults = { defaults: true };
    const _defaults = jest.fn().mockReturnValue(defaults);

    const action = createEmailAction(server, { _options, _defaults });

    expect(action instanceof EmailAction).toBe(true);
    expect(action.defaults).toBe(defaults);

    expect(server.config).toHaveBeenCalledTimes(1);
    expect(server.config).toHaveBeenCalledWith();
    expect(_options).toHaveBeenCalledTimes(1);
    expect(_options).toHaveBeenCalledWith(config);
    expect(_defaults).toHaveBeenCalledTimes(1);
    expect(_defaults).toHaveBeenCalledWith(config);
  });

});
