/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WebClient } from '@slack/client';
import { ActionResult } from '../';
import {
  SLACK_ACTION_ID,
  SlackAction,
  webClientCreator,
} from './slack_action';

describe('SlackAction', () => {

  const server = { };
  const options = { options: true };
  const defaults = { defaults: true };
  const client = {
    api: {
      // see beforeEach
    },
    chat: {
      // see beforeEach
    }
  };
  let _webClientCreator;

  let action;

  beforeEach(() => {
    client.api.test = jest.fn();
    client.chat.postMessage = jest.fn();
    _webClientCreator = jest.fn().mockReturnValue(client);

    action = new SlackAction({ server, options, defaults, _webClientCreator });
  });

  test('webClientCreator creates a WebClient', () => {
    expect(webClientCreator('faketoken') instanceof WebClient).toBe(true);
  });

  test('id and name to be from constructor', () => {
    expect(action.getId()).toBe(SLACK_ACTION_ID);
    expect(action.getName()).toBe('Slack');
    expect(action.client).toBe(client);

    expect(_webClientCreator).toHaveBeenCalledTimes(1);
    expect(_webClientCreator).toHaveBeenCalledWith(options);
  });

  describe('getMissingFields', () => {

    test('returns missing fields', () => {
      const channel = { field: 'channel', name: 'Channel', type: 'text' };
      const subject = { field: 'subject', name: 'Message', type: 'markdown' };

      const missing = [
        { defaults: { }, notification: { }, missing: [ channel, subject, ], },
        { defaults: { }, notification: { channel: '#kibana', }, missing: [ subject, ], },
        { defaults: { channel: '#kibana', }, notification: { }, missing: [ subject, ], },
        { defaults: { }, notification: { subject: 'subject', }, missing: [ channel, ], },
      ];

      missing.forEach(check => {
        const newDefaultsAction = new SlackAction({ server, options, defaults: check.defaults, _webClientCreator });

        expect(newDefaultsAction.getMissingFields(check.notification)).toEqual(check.missing);
      });
    });

    test('returns [] when all fields exist', () => {
      const exists = [
        { defaults: { }, notification: { channel: '#kibana', subject: 'subject', }, },
        { defaults: { channel: '#kibana', }, notification: { subject: 'subject', }, },
      ];

      exists.forEach(check => {
        const newDefaultsAction = new SlackAction({ server, options, defaults: check.defaults, _webClientCreator });

        expect(newDefaultsAction.getMissingFields(check.notification)).toEqual([]);
      });
    });

  });

  describe('doPerformHealthCheck', () => {

    test('rethrows Error for failure', async () => {
      const error = new Error('TEST - expected');

      client.api.test.mockRejectedValue(error);

      await expect(action.doPerformHealthCheck())
        .rejects
        .toThrow(error);

      expect(client.api.test).toHaveBeenCalledTimes(1);
      expect(client.api.test).toHaveBeenCalledWith();
    });

    test('returns ActionResult if not ok with error', async () => {
      const response = { ok: false, error: { expected: true } };

      client.api.test.mockResolvedValue(response);

      const result = await action.doPerformHealthCheck();

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(false);
      expect(result.getMessage()).toMatch('Slack action configuration could not be verified.');
      expect(result.getResponse()).toBe(response);
      expect(result.getError()).toBe(response.error);

      expect(client.api.test).toHaveBeenCalledTimes(1);
      expect(client.api.test).toHaveBeenCalledWith();
    });

    test('returns ActionResult if not ok with default error', async () => {
      const response = { ok: false };

      client.api.test.mockResolvedValue(response);

      const result = await action.doPerformHealthCheck();

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(false);
      expect(result.getMessage()).toMatch('Slack action configuration could not be verified.');
      expect(result.getResponse()).toBe(response);
      expect(result.getError()).toEqual({ message: 'Unknown Error' });

      expect(client.api.test).toHaveBeenCalledTimes(1);
      expect(client.api.test).toHaveBeenCalledWith();
    });

    test('returns ActionResult for success', async () => {
      const response = { ok: true };

      client.api.test.mockResolvedValue(response);

      const result = await action.doPerformHealthCheck();

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(true);
      expect(result.getMessage()).toMatch('Slack action configuration has been verified.');
      expect(result.getResponse()).toBe(response);

      expect(client.api.test).toHaveBeenCalledTimes(1);
      expect(client.api.test).toHaveBeenCalledWith();
    });

  });

  describe('renderMessage', () => {

    test('does not contain attachments', () => {
      const message = { subject: 'subject' };
      const response = action.renderMessage(message);

      expect(response).toMatchObject({
        text: message.subject,
        attachments: [ ]
      });
    });

    test('contains attachments', () => {
      const message = { subject: 'subject', markdown: 'markdown' };
      const response = action.renderMessage(message);

      expect(response).toMatchObject({
        text: message.subject,
        attachments: [
          {
            text: message.markdown
          }
        ]
      });
    });

  });

  describe('doPerformAction', () => {
    const message = { channel: '#kibana', subject: 'subject', markdown: 'body', };

    test('rethrows Error for failure', async () => {
      const error = new Error('TEST - expected');

      client.chat.postMessage.mockRejectedValue(error);

      await expect(action.doPerformAction(message))
        .rejects
        .toThrow(error);

      expect(client.chat.postMessage).toHaveBeenCalledTimes(1);
      expect(client.chat.postMessage).toHaveBeenCalledWith({
        ...defaults,
        ...action.renderMessage(message),
        channel: message.channel,
      });
    });

    test('returns ActionResult for failure without Error', async () => {
      const response = { fake: true, error: { expected: true } };

      client.chat.postMessage.mockResolvedValue(response);

      const result = await action.doPerformAction(message);

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(false);
      expect(result.getMessage()).toMatch(`Posted Slack message to channel '${message.channel}'.`);
      expect(result.getResponse()).toBe(response);
      expect(result.getError()).toBe(response.error);

      expect(client.chat.postMessage).toHaveBeenCalledTimes(1);
      expect(client.chat.postMessage).toHaveBeenCalledWith({
        ...defaults,
        ...action.renderMessage(message),
        channel: message.channel,
      });
    });


    test('returns ActionResult for success', async () => {
      const response = { fake: true };

      client.chat.postMessage.mockResolvedValue(response);

      const result = await action.doPerformAction(message);

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(true);
      expect(result.getMessage()).toMatch(`Posted Slack message to channel '${message.channel}'.`);
      expect(result.getResponse()).toBe(response);

      expect(client.chat.postMessage).toHaveBeenCalledTimes(1);
      expect(client.chat.postMessage).toHaveBeenCalledWith({
        ...defaults,
        ...action.renderMessage(message),
        channel: message.channel,
      });
    });

    test('returns ActionResult for success with default channel', async () => {
      const response = { fake: false };

      client.chat.postMessage.mockResolvedValue(response);

      const channelDefaults = {
        ...defaults,
        channel: '#kibana',
      };
      const noChannelMessage = {
        ...message,
        channel: undefined,
      };
      const newDefaultsAction = new SlackAction({ server, options, defaults: channelDefaults, _webClientCreator });

      const result = await newDefaultsAction.doPerformAction(noChannelMessage);

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(true);
      expect(result.getMessage()).toMatch(`Posted Slack message to channel '${channelDefaults.channel}'.`);
      expect(result.getResponse()).toBe(response);

      expect(client.chat.postMessage).toHaveBeenCalledTimes(1);
      expect(client.chat.postMessage).toHaveBeenCalledWith({
        ...defaults,
        ...action.renderMessage(noChannelMessage),
        channel: channelDefaults.channel,
      });
    });

  });

});
