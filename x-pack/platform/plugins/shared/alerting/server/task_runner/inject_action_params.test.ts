/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectActionParams } from './inject_action_params';

describe('injectActionParams', () => {
  test(`passes through when actionTypeId isn't .email or .pagerduty`, () => {
    const actionParams = {
      message: 'State: "{{state.value}}", Context: "{{context.value}}"',
    };

    const result = injectActionParams({
      actionParams,
      actionTypeId: '.server-log',
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "message": "State: \\"{{state.value}}\\", Context: \\"{{context.value}}\\"",
      }
    `);
  });

  test('injects viewInKibanaPath and viewInKibanaText when actionTypeId is .email and there is no basePathname', () => {
    const actionParams = {
      body: {
        message: 'State: "{{state.value}}", Context: "{{context.value}}"',
      },
    };
    const ruleUrl = {
      absoluteUrl:
        'http://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/1',
      kibanaBaseUrl: 'http://localhost:5601',
      basePathname: '',
      spaceIdSegment: '',
      relativePath: '/app/management/insightsAndAlerting/triggersActions/rule/1',
    };
    const result = injectActionParams({
      actionParams,
      actionTypeId: '.email',
      ruleUrl,
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "message": "State: \\"{{state.value}}\\", Context: \\"{{context.value}}\\"",
        },
        "kibanaFooterLink": Object {
          "path": "/app/management/insightsAndAlerting/triggersActions/rule/1",
          "text": "View rule in Kibana",
        },
      }
    `);
  });

  test('injects the absoluteUrl to the links when actionTypeId is .pagerduty and there are no links', () => {
    const actionParams = {
      summary: 'My summary',
    };

    const ruleUrl = {
      absoluteUrl:
        'http://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/1',
      kibanaBaseUrl: 'http://localhost:5601',
      basePathname: '',
      spaceIdSegment: '',
      relativePath: '/app/management/insightsAndAlerting/triggersActions/rule/1',
    };

    const result = injectActionParams({
      actionParams,
      actionTypeId: '.pagerduty',
      ruleUrl,
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "links": Array [
          Object {
            "href": "http://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/1",
            "text": "Elastic Rule \\"Unknown\\"",
          },
        ],
        "summary": "My summary",
      }
    `);
  });

  test('adds the rule name if the rule is defined when actionTypeId is .pagerduty', () => {
    const actionParams = {
      summary: 'My summary',
    };

    const ruleUrl = {
      absoluteUrl:
        'http://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/1',
      kibanaBaseUrl: 'http://localhost:5601',
      basePathname: '',
      spaceIdSegment: '',
      relativePath: '/app/management/insightsAndAlerting/triggersActions/rule/1',
    };

    const result = injectActionParams({
      actionParams,
      actionTypeId: '.pagerduty',
      ruleUrl,
      ruleName: 'My rule',
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "links": Array [
          Object {
            "href": "http://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/1",
            "text": "Elastic Rule \\"My rule\\"",
          },
        ],
        "summary": "My summary",
      }
    `);
  });

  test('does not produce a runtime error when the actionTypeId is .pagerduty and the links are not an array', () => {
    const actionParams = {
      summary: 'My summary',
      links: 'error',
    };

    const ruleUrl = {
      absoluteUrl:
        'http://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/1',
      kibanaBaseUrl: 'http://localhost:5601',
      basePathname: '',
      spaceIdSegment: '',
      relativePath: '/app/management/insightsAndAlerting/triggersActions/rule/1',
    };

    const result = injectActionParams({
      actionParams,
      actionTypeId: '.pagerduty',
      ruleUrl,
      ruleName: 'My rule',
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "links": Array [
          Object {
            "href": "http://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/1",
            "text": "Elastic Rule \\"My rule\\"",
          },
        ],
        "summary": "My summary",
      }
    `);
  });

  test('injects the absoluteUrl to the links when actionTypeId is .pagerduty with links', () => {
    const actionParams = {
      summary: 'My summary',
      links: [{ href: 'https://example.com', text: 'My link' }],
    };

    const ruleUrl = {
      absoluteUrl:
        'http://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/1',
      kibanaBaseUrl: 'http://localhost:5601',
      basePathname: '',
      spaceIdSegment: '',
      relativePath: '/app/management/insightsAndAlerting/triggersActions/rule/1',
    };

    const result = injectActionParams({
      actionParams,
      actionTypeId: '.pagerduty',
      ruleUrl,
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "links": Array [
          Object {
            "href": "http://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/1",
            "text": "Elastic Rule \\"Unknown\\"",
          },
          Object {
            "href": "https://example.com",
            "text": "My link",
          },
        ],
        "summary": "My summary",
      }
    `);
  });

  test('injects viewInKibanaPath and viewInKibanaText when actionTypeId is .email with basePathname and spaceId', () => {
    const actionParams = {
      body: {
        message: 'State: "{{state.value}}", Context: "{{context.value}}"',
      },
    };
    const ruleUrl = {
      absoluteUrl:
        'http://localhost:5601/kibana/s/mary/app/management/insightsAndAlerting/triggersActions/rule/1',
      kibanaBaseUrl: 'http://localhost:5601/kibana',
      basePathname: '/kibana',
      spaceIdSegment: '/s/mary',
      relativePath: '/app/management/insightsAndAlerting/triggersActions/rule/1',
    };
    const result = injectActionParams({
      actionParams,
      actionTypeId: '.email',
      ruleUrl,
    });
    // path in the snapshot should not include /kibana since it is part of kibanaBaseUrl already
    expect(result).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "message": "State: \\"{{state.value}}\\", Context: \\"{{context.value}}\\"",
        },
        "kibanaFooterLink": Object {
          "path": "/s/mary/app/management/insightsAndAlerting/triggersActions/rule/1",
          "text": "View rule in Kibana",
        },
      }
    `);
  });

  test('injects viewInKibanaPath as empty string when the ruleUrl is undefined and the actionTypeId is .email', () => {
    const actionParams = {
      body: {
        message: 'State: "{{state.value}}", Context: "{{context.value}}"',
      },
    };

    const result = injectActionParams({
      actionParams,
      actionTypeId: '.email',
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "message": "State: \\"{{state.value}}\\", Context: \\"{{context.value}}\\"",
        },
        "kibanaFooterLink": Object {
          "path": "",
          "text": "View rule in Kibana",
        },
      }
    `);
  });

  test('does not add the rule URL when the absoluteUrl is undefined and the actionTypeId is .pagerduty', () => {
    const actionParams = {
      summary: 'My summary',
    };

    const result = injectActionParams({
      actionParams,
      actionTypeId: '.pagerduty',
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "summary": "My summary",
      }
    `);
  });
});
