/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isArray, isObject, isString } from 'lodash';
import mustache from 'mustache';
import chrome from 'ui/chrome';
import uuid from 'uuid';
import { StringMap } from '../../../../../../typings/common';
// @ts-ignore
import * as rest from '../../../../../services/rest/watcher';
import { createErrorGroupWatch } from '../createErrorGroupWatch';
import { esResponse } from './esResponse';

jest.mock('ui/kfetch');

// disable html escaping since this is also disabled in watcher\s mustache implementation
mustache.escape = value => value;

describe('createErrorGroupWatch', () => {
  let createWatchResponse: string;
  let tmpl: any;
  beforeEach(async () => {
    chrome.getInjected = jest.fn().mockReturnValue('myIndexPattern');
    jest.spyOn(uuid, 'v4').mockReturnValue(new Buffer('mocked-uuid'));
    jest.spyOn(rest, 'createWatch').mockReturnValue(undefined);

    createWatchResponse = await createErrorGroupWatch({
      emails: ['my@email.dk', 'mySecond@email.dk'],
      schedule: {
        daily: {
          at: '08:00'
        }
      },
      serviceName: 'opbeans-node',
      slackUrl: 'https://hooks.slack.com/services/slackid1/slackid2/slackid3',
      threshold: 10,
      timeRange: { value: 24, unit: 'h' }
    });

    const watchBody = rest.createWatch.mock.calls[0][1];
    const templateCtx = {
      payload: esResponse,
      metadata: watchBody.metadata
    };

    tmpl = renderMustache(rest.createWatch.mock.calls[0][1], templateCtx);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should call createWatch with correct args', () => {
    expect(rest.createWatch.mock.calls[0][0]).toBe('apm-mocked-uuid');
  });

  it('should format slack message correctly', () => {
    expect(tmpl.actions.slack_webhook.webhook.path).toBe(
      '/services/slackid1/slackid2/slackid3'
    );

    expect(
      JSON.parse(tmpl.actions.slack_webhook.webhook.body.slice(10)).text
    ).toMatchSnapshot();
  });

  it('should format email correctly', () => {
    expect(tmpl.actions.email.email.to).toEqual(
      'my@email.dk,mySecond@email.dk'
    );
    expect(tmpl.actions.email.email.subject).toBe(
      '"opbeans-node" has error groups which exceeds the threshold'
    );
    expect(
      tmpl.actions.email.email.body.html.replace(/<br\/>/g, '\n')
    ).toMatchSnapshot();
  });

  it('should format template correctly', () => {
    expect(tmpl).toMatchSnapshot();
  });

  it('should return watch id', async () => {
    const id = rest.createWatch.mock.calls[0][0];
    expect(createWatchResponse).toEqual(id);
  });
});

// Recursively iterate a nested structure and render strings as mustache templates
type InputOutput = string | string[] | StringMap<any>;
function renderMustache(input: InputOutput, ctx: StringMap): InputOutput {
  if (isString(input)) {
    return mustache.render(input, {
      ctx,
      join: () => (text: string, render: any) => render(`{{${text}}}`, { ctx })
    });
  }

  if (isArray(input)) {
    return input.map(itemValue => renderMustache(itemValue, ctx));
  }

  if (isObject(input)) {
    return Object.keys(input).reduce((acc, key) => {
      const value = input[key];

      return { ...acc, [key]: renderMustache(value, ctx) };
    }, {});
  }

  return input;
}
