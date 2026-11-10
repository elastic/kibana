/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWorkflowLiquidEngine } from '@kbn/workflows';
import type { InlineActionStepDefinition } from '../registry';
import { getInlineActionStepDefinition } from '../registry';
import { parseInlineParams } from './parse_inline_params';

const email = getInlineActionStepDefinition('email');
const slack = getInlineActionStepDefinition('slack2.sendMessage');

if (!email || !slack) {
  throw new Error('Expected the email and slack2 step definitions to be registered.');
}

describe('parseInlineParams', () => {
  describe('valid params', () => {
    it('returns the parsed email params', () => {
      expect(
        parseInlineParams(
          email,
          'to:\n  - ops@example.com\nsubject: Alert\nmessage: "{{ inputs.payload.policyId }}"\ncc:\n  - cc@example.com\n'
        )
      ).toEqual({
        params: {
          to: ['ops@example.com'],
          subject: 'Alert',
          message: '{{ inputs.payload.policyId }}',
          cc: ['cc@example.com'],
        },
        errors: [],
      });
    });

    it('returns the parsed slack params', () => {
      expect(parseInlineParams(slack, 'channel: C123\ntext: Hello\n')).toEqual({
        params: { channel: 'C123', text: 'Hello' },
        errors: [],
      });
    });
  });

  describe('default templates', () => {
    const STANDARD_ALERT_FIELDS = [
      'inputs.payload.rules[alert.rule_id].name | default: "Unnamed rule"',
      'alert.alert_status | capitalize',
      'alert.severity | capitalize',
      'alert.last_event_timestamp',
      '{{ alert.alert_url }}',
      '{{ alert.alert_id }}',
    ];
    const emailParams = email.paramsTemplate
      .replace('- ""', '- ops@example.com')
      .replace('subject: ""', 'subject: Alert');
    const slackParams = slack.paramsTemplate.replace('channel: ""', 'channel: C123');

    it.each([
      ['email', email, emailParams, 'message'],
      ['slack', slack, slackParams, 'text'],
    ])(
      'accepts the %s template once the user-supplied fields are filled in',
      (_, definition, params, bodyField) => {
        const result = parseInlineParams(definition, params);

        expect(result.errors).toEqual([]);
        STANDARD_ALERT_FIELDS.forEach((field) => {
          expect(result.params?.[bodyField]).toContain(field);
        });
      }
    );

    describe('rendering', () => {
      // Same options as the templating engine of the workflows execution engine.
      const engine = createWorkflowLiquidEngine({ strictFilters: true, strictVariables: false });
      const alertUrl = (alertId: string): string =>
        `https://kibana.example.com/app/observability/alerting/alerts/${alertId}`;
      const rules = { 'rule-1': { name: 'High error count' } };
      const namedAlert = {
        alert_id: 'alert-1',
        alert_url: alertUrl('alert-1'),
        alert_status: 'active',
        severity: 'high',
        rule_id: 'rule-1',
        last_event_timestamp: '2026-10-30T13:42:00.000Z',
      };
      // Its rule is not in the payload and it has no severity.
      const unnamedAlert = {
        alert_id: 'alert-2',
        alert_url: alertUrl('alert-2'),
        alert_status: 'recovering',
        rule_id: null,
        last_event_timestamp: '2026-10-30T13:42:00.000Z',
      };

      const renderBody = (
        definition: InlineActionStepDefinition,
        params: string,
        bodyField: string,
        alerts: object[]
      ): string => {
        const body = String(parseInlineParams(definition, params).params?.[bodyField]);
        return engine.parseAndRenderSync(body, { inputs: { payload: { alerts, rules } } });
      };

      // Email lines end with `\`, a Markdown line break; Slack mrkdwn keeps plain newlines.
      describe.each([
        {
          name: 'email',
          definition: email,
          params: emailParams,
          bodyField: 'message',
          namedBlock: [
            '**High error count** — Active · High\\',
            `Last event 2026-10-30 13:42 UTC · [View in app](${alertUrl('alert-1')})\\`,
            'Alert id: alert-1',
          ],
          unnamedBlock: [
            '**Unnamed rule** — Recovering\\',
            `Last event 2026-10-30 13:42 UTC · [View in app](${alertUrl('alert-2')})\\`,
            'Alert id: alert-2',
          ],
          countHeader: '**2 alerts**',
        },
        {
          name: 'slack',
          definition: slack,
          params: slackParams,
          bodyField: 'text',
          namedBlock: [
            '*High error count* — Active · High',
            `Last event 2026-10-30 13:42 UTC · <${alertUrl('alert-1')}|View in app>`,
            'Alert id: alert-1',
          ],
          unnamedBlock: [
            '*Unnamed rule* — Recovering',
            `Last event 2026-10-30 13:42 UTC · <${alertUrl('alert-2')}|View in app>`,
            'Alert id: alert-2',
          ],
          countHeader: '*2 alerts*',
        },
      ])(
        'the $name template',
        ({ definition, params, bodyField, namedBlock, unnamedBlock, countHeader }) => {
          it('renders a single alert as one block without a count header', () => {
            expect(renderBody(definition, params, bodyField, [namedAlert])).toBe(
              [...namedBlock, ''].join('\n')
            );
          });

          it('renders grouped alerts under a count header, one block each', () => {
            expect(renderBody(definition, params, bodyField, [namedAlert, unnamedAlert])).toBe(
              [countHeader, '', ...namedBlock, '', ...unnamedBlock, ''].join('\n')
            );
          });
        }
      );
    });
  });

  describe('yaml errors', () => {
    it('reports malformed YAML with its location', () => {
      expect(parseInlineParams(email, 'to: "unterminated\n').errors).toEqual([
        'Invalid YAML: Missing closing "quote at line 2, column 1',
      ]);
    });

    it.each([
      ['empty params', ''],
      ['a list', '- a\n- b\n'],
      ['a scalar', 'hello\n'],
    ])('reports %s as not a map', (_, params) => {
      expect(parseInlineParams(email, params).errors).toEqual([
        'Parameters must be a YAML map of field names to values.',
      ]);
    });
  });

  describe('schema errors', () => {
    it.each([
      ['the untouched email template', email, email.paramsTemplate, ['to', 'subject']],
      ['the untouched slack template', slack, slack.paramsTemplate, ['channel']],
      ['an empty map', email, '{}\n', ['to', 'subject', 'message']],
    ])('names every mandatory field of %s', (_, definition, params, fields) => {
      expect(parseInlineParams(definition, params).errors).toEqual(
        fields.map((field) => `'${field}' is required.`)
      );
    });

    it.each([
      [
        'a missing or null field',
        'to:\nsubject: Hi\n',
        ["'to' is required.", "'message' is required."],
      ],
      ['an empty list', 'to: []\nsubject: Hi\nmessage: Body\n', ["'to' is required."]],
      [
        'blank optional list entries (once)',
        'to: [a@b.com]\nsubject: Hi\nmessage: Body\ncc: ["", " "]\n',
        ["'cc' must not contain empty values."],
      ],
      [
        'blank mandatory list entries (once)',
        'to: ["", " "]\nsubject: Hi\nmessage: Body\n',
        ["'to' is required."],
      ],
      [
        'an optional field without a value',
        'to: [a@b.com]\nsubject: Hi\nmessage: Body\ncc:\n',
        ["'cc' must be a list of strings."],
      ],
      [
        'a string where a list is expected',
        'to: a@example.com\nsubject: Hi\nmessage: Body\n',
        ["'to' must be a list of strings."],
      ],
      [
        'a non-string list entry',
        'to: [a@b.com]\nsubject: Hi\nmessage: Body\ncc: [1]\n',
        ["'cc' must be a list of strings."],
      ],
      [
        'a list or number where a string is expected',
        'to: [a@b.com]\nsubject: [Hi]\nmessage: 5\n',
        ["'subject' must be a string.", "'message' must be a string."],
      ],
    ])('reports %s', (_, params, errors) => {
      expect(parseInlineParams(email, params).errors).toEqual(errors);
    });

    it('reports an unknown field', () => {
      expect(
        parseInlineParams(slack, 'channel: C123\ntext: Hello\nthreadTs: "1"\n').errors
      ).toEqual(["Unknown field: 'threadTs'."]);
    });

    it('quotes every unknown field', () => {
      expect(
        parseInlineParams(slack, 'channel: C123\ntext: Hello\nthreadTs: "1"\nblocks: []\n').errors
      ).toEqual(["Unknown fields: 'threadTs', 'blocks'."]);
    });

    it('does not return params when invalid', () => {
      expect(parseInlineParams(slack, 'channel: C123\n').params).toBeUndefined();
    });
  });
});
