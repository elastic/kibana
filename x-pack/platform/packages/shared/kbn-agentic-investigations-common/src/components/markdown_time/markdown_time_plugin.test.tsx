/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { TimeAwareMarkdown } from './time_aware_markdown';
import { parseTimeTagDatetime } from './time_tag';

let mockDateFormat: string | undefined = 'MMM D, YYYY @ HH:mm:ss.SSS';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      settings: mockDateFormat ? { client: { get: () => mockDateFormat } } : undefined,
    },
  }),
}));

const NOW = '2026-11-26T17:20:00Z';
const TAG = '<time datetime="2026-11-24T17:20:00Z"></time>';

const renderText = (text: string) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <TimeAwareMarkdown>{text}</TimeAwareMarkdown>
      </EuiProvider>
    </I18nProvider>
  );

describe('markdown time tag', () => {
  let originalNow: () => number;
  let defaultZone: string | undefined;

  beforeEach(() => {
    originalNow = Date.now;
    Date.now = () => new Date(NOW).getTime();
    defaultZone = moment.tz.guess();
    moment.tz.setDefault('Asia/Tokyo');
    mockDateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';
  });

  afterEach(() => {
    Date.now = originalNow;
    moment.tz.setDefault(defaultZone);
  });

  describe('parseTimeTagDatetime', () => {
    it.each(['2026-11-24T17:20:00Z', '2026-11-24T17:20Z', '2026-11-24T19:20:00.123+02:00'])(
      'accepts %s',
      (value) => {
        expect(parseTimeTagDatetime(value)?.isValid()).toBe(true);
      }
    );

    it.each([
      'garbage',
      '',
      undefined,
      '2026-11-24',
      '2026-11-24T17:20:00',
      '2026-13-45T17:20:00Z',
    ])('rejects %s', (value) => {
      expect(parseTimeTagDatetime(value)).toBeUndefined();
    });
  });

  describe('rendering', () => {
    it.each([
      ['an empty tag', TAG],
      ['a self-closed tag', '<time datetime="2026-11-24T17:20:00Z"/>'],
      ['a tag with fallback text', '<time datetime="2026-11-24T17:20:00Z">17:20Z</time>'],
    ])('renders %s as a relative time with no raw markup', (_, tag) => {
      const { container } = renderText(`Errors began at ${tag}, then recovered.`);

      const time = screen.getByTestId('agenticInvestigationsMarkdownTime');
      expect(time).toHaveTextContent('2 days ago');
      expect(time).toHaveAttribute('datetime', '2026-11-24T17:20:00Z');
      expect(container).toHaveTextContent('Errors began at 2 days ago, then recovered.');
      expect(container).not.toHaveTextContent('<time');
      expect(container).not.toHaveTextContent('17:20Z');
    });

    it('renders a tag that opens a block as a time', () => {
      renderText(`<time datetime="2026-11-24T17:20:00Z"/>\nstarted the incident`);

      expect(screen.getByTestId('agenticInvestigationsMarkdownTime')).toHaveTextContent(
        '2 days ago'
      );
      expect(screen.getByText(/started the incident/)).toBeInTheDocument();
    });

    it('renders several times, in lists and next to other markdown', () => {
      renderText(`- **on** at ${TAG}\n- off at <time datetime="2026-11-24T19:05:00Z"></time>`);

      expect(screen.getAllByTestId('agenticInvestigationsMarkdownTime')).toHaveLength(2);
      expect(screen.getByText('on').tagName).toBe('STRONG');
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('shows the time in the viewer zone and the UTC value in the tooltip', async () => {
      renderText(`at ${TAG}`);

      await act(async () => {
        await userEvent.hover(screen.getByTestId('agenticInvestigationsMarkdownTime'));
      });

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent('Nov 25, 2026 @ 02:20:00.000');
      expect(tooltip).toHaveTextContent('UTC: 2026-11-24T17:20:00Z');
    });

    it('follows the viewer zone and the date format', async () => {
      moment.tz.setDefault('America/Los_Angeles');
      mockDateFormat = 'YYYY-MM-DD HH:mm';
      renderText(`at ${TAG}`);

      await act(async () => {
        await userEvent.hover(screen.getByTestId('agenticInvestigationsMarkdownTime'));
      });

      expect(await screen.findByRole('tooltip')).toHaveTextContent('2026-11-24 09:20');
    });

    it('falls back to the default date format without UI settings in context', async () => {
      mockDateFormat = undefined;
      renderText(`at ${TAG}`);

      await act(async () => {
        await userEvent.hover(screen.getByTestId('agenticInvestigationsMarkdownTime'));
      });

      expect(await screen.findByRole('tooltip')).toHaveTextContent('Nov 25, 2026 @ 02:20:00.000');
    });
  });

  describe('invalid or incomplete tags', () => {
    it.each([
      ['a bad datetime', '<time datetime="garbage"></time>', '<time datetime="garbage"></time>'],
      [
        'a datetime without a zone',
        '<time datetime="2026-11-24T17:20:00"></time>',
        '<time datetime="2026-11-24T17:20:00"></time>',
      ],
      ['a missing datetime', '<time></time>', '<time></time>'],
      [
        'a cut-off tag',
        '<time datetime="2026-11-24T17:20:00Z"',
        '<time datetime="2026-11-24T17:20:00Z"',
      ],
      [
        'an unclosed tag',
        '<time datetime="2026-11-24T17:20:00Z">',
        '<time datetime="2026-11-24T17:20:00Z">',
      ],
      ['a lone open tag', '<time>', '<time>'],
      ['a lone close tag', '</time>', '</time>'],
    ])('renders %s as text', (_, tag, expected) => {
      const { container } = renderText(`before ${tag} after`);

      expect(screen.queryByTestId('agenticInvestigationsMarkdownTime')).not.toBeInTheDocument();
      expect(container).toHaveTextContent(`before ${expected} after`);
    });

    it('renders the inner text of a tag with a bad datetime', () => {
      const { container } = renderText('at <time datetime="soon">17:20Z</time> sharp');

      expect(screen.queryByTestId('agenticInvestigationsMarkdownTime')).not.toBeInTheDocument();
      expect(container).toHaveTextContent('at 17:20Z sharp');
    });

    it('renders a block-level lone tag as text', () => {
      const { container } = renderText('<time>');

      expect(container).toHaveTextContent('<time>');
    });
  });

  it('renders prose without a time tag as before', () => {
    const { container } = renderText(
      '**bold** and `code` and [a link](https://elastic.co)\n\n- one\n- two <timeline> here'
    );

    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('code').tagName).toBe('CODE');
    expect(screen.getByRole('link', { name: /a link/ })).toHaveAttribute(
      'href',
      'https://elastic.co'
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByTestId('agenticInvestigationsMarkdownTime')).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent('ago');
  });
});
