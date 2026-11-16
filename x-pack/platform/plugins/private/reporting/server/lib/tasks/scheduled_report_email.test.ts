/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  MAX_CUSTOM_TEMPLATE_VARIABLES,
  MAX_SUMMARY_MARKDOWN_LENGTH,
  MAX_TEMPLATE_VARIABLE_VALUE_LENGTH,
  renderScheduledReportEmail,
} from './scheduled_report_email';

const logger = loggingSystemMock.createLogger();
const baseVariables = {
  title: 'Weekly report',
  filename: 'report.pdf',
  objectType: 'test',
  date: '2025-06-04',
};

const render = (
  messageTemplate: string,
  notification?: Parameters<typeof renderScheduledReportEmail>[0]['notification'],
  subjectTemplate = '{{title}}'
) =>
  renderScheduledReportEmail({
    logger,
    subjectTemplate,
    messageTemplate,
    baseVariables,
    notification,
  });

describe('renderScheduledReportEmail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders only the built-in variables when the export type adds nothing', () => {
    expect(render('{{title}} {{summary}}!')).toEqual({
      subject: 'Weekly report',
      message: 'Weekly report !',
    });
  });

  it('exposes custom template variables in subject and message', () => {
    const notification = { templateVariables: { lcp: 2.1, worst: 'checkout', ok: true } };
    expect(render('{{lcp}} / {{worst}} / {{ok}}', notification, 'LCP {{lcp}}')).toEqual({
      subject: 'LCP 2.1',
      message: '2.1 / checkout / true',
    });
  });

  it('escapes custom variable values like the built-in ones', () => {
    const { message } = render('{{page}}', { templateVariables: { page: '[x](http://evil)' } });
    expect(message).toBe('\\[x\\]\\(http://evil\\)');
  });

  it('does not let custom variables override built-in ones', () => {
    const { subject } = render('', { templateVariables: { title: 'hijacked' } });
    expect(subject).toBe('Weekly report');
  });

  it('ignores invalid variable names and unsupported values', () => {
    const notification = {
      templateVariables: {
        'a.b': 'dotted',
        __proto__: 'x',
        'not valid': 'space',
        good: 'ok',
        nested: { a: 1 } as unknown as string,
      },
    };
    expect(render('{{good}}|{{nested}}|{{a.b}}', notification).message).toBe('ok||');
  });

  it('caps the number and length of custom variables', () => {
    const templateVariables: Record<string, string> = { long: 'a'.repeat(5000) };
    for (let i = 0; i < MAX_CUSTOM_TEMPLATE_VARIABLES + 10; i++) {
      templateVariables[`v${i}`] = 'x';
    }
    const { message } = render('{{long}}|{{v0}}|{{v59}}', { templateVariables });
    expect(message).toBe(`${'a'.repeat(MAX_TEMPLATE_VARIABLE_VALUE_LENGTH)}|x|`);
  });

  describe('summaryMarkdown', () => {
    it('renders the summary as markdown in the message', () => {
      const summaryMarkdown = '**Checkout app**\n- p75 LCP 2.1 s';
      const { message } = render('Hi\n\n{{summary}}\n\nBye', { summaryMarkdown });
      expect(message).toBe(`Hi\n\n${summaryMarkdown}\n\nBye`);
    });

    it('does not expose the summary in the subject', () => {
      const { subject } = render('', { summaryMarkdown: 'secret' }, '{{title}} {{summary}}');
      expect(subject).toBe('Weekly report ');
    });

    it('escapes raw html and drops unsafe link schemes', () => {
      const { message } = render('{{summary}}', {
        summaryMarkdown: '<script>x</script> [a](javascript:alert(1)) [b](https://elastic.co)',
      });
      expect(message).toBe('&lt;script>x&lt;/script> [a](#alert(1)) [b](https://elastic.co)');
    });

    it('truncates long summaries', () => {
      const { message } = render('{{summary}}', {
        summaryMarkdown: 'a'.repeat(MAX_SUMMARY_MARKDOWN_LENGTH + 100),
      });
      expect(message).toHaveLength(MAX_SUMMARY_MARKDOWN_LENGTH);
    });

    it('keeps special replacement patterns in the summary literal', () => {
      const { message } = render('{{summary}}', { summaryMarkdown: 'costs $& and $1' });
      expect(message).toBe('costs $& and $1');
    });
  });
});
