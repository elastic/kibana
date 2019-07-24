/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SlackAction } from './slack_action';
import {
  createSlackAction,
  defaultsFromConfig,
  optionsFromConfig,
} from './create_slack_action';

describe('create_slack_action', () => {

  test('optionsFromConfig uses config without modification', () => {
    const get = key => {
      const suffixes = [
        'token',
      ];
      const value = suffixes.find(suffix => {
        return `xpack.notifications.slack.${suffix}` === key;
      });

      if (value === undefined) {
        throw new Error(`Unknown config key used ${key}`);
      }

      return value;
    };

    expect(optionsFromConfig({ get })).toEqual({
      token: 'token',
    });
  });

  test('defaultsFromConfig uses config without modification', () => {
    const get = key => {
      const suffixes = [
        'channel',
        'as_user',
        'icon_emoji',
        'icon_url',
        'link_names',
        'mrkdwn',
        'unfurl_links',
        'unfurl_media',
        'username',
      ];
      const value = suffixes.find(suffix => {
        return `xpack.notifications.slack.defaults.${suffix}` === key;
      });

      if (value === undefined) {
        throw new Error(`Unknown config key used ${key}`);
      }

      return value;
    };

    expect(defaultsFromConfig({ get })).toEqual({
      channel: 'channel',
      as_user: 'as_user',
      icon_emoji: 'icon_emoji',
      icon_url: 'icon_url',
      link_names: 'link_names',
      mrkdwn: 'mrkdwn',
      unfurl_links: 'unfurl_links',
      unfurl_media: 'unfurl_media',
      username: 'username',
    });
  });

  test('createSlackAction', async () => {
    const config = { };
    const server = { config: jest.fn().mockReturnValue(config) };
    const _options = jest.fn().mockReturnValue({ options: true });
    const defaults = { defaults: true };
    const _defaults = jest.fn().mockReturnValue(defaults);

    const action = createSlackAction(server, { _options, _defaults });

    expect(action instanceof SlackAction).toBe(true);
    expect(action.defaults).toBe(defaults);

    expect(server.config).toHaveBeenCalledTimes(1);
    expect(server.config).toHaveBeenCalledWith();
    expect(_options).toHaveBeenCalledTimes(1);
    expect(_options).toHaveBeenCalledWith(config);
    expect(_defaults).toHaveBeenCalledTimes(1);
    expect(_defaults).toHaveBeenCalledWith(config);
  });

});
