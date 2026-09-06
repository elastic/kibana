/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHTML, renderSlack } from '@kbn/adaptive-ui';
import { sampleViewSpec } from '../../common/sample_view_spec';
import {
  toBlockKitJsonDownload,
  toHtmlDownload,
  toMarkdownDownload,
  toTextDownload,
  toViewSpecJsonDownload,
} from './serializers';

describe('serializers', () => {
  it('renders text', () => {
    // The text surface upper-cases headings.
    expect(toTextDownload(sampleViewSpec).toLowerCase()).toContain(
      sampleViewSpec.title!.toLowerCase()
    );
  });

  it('renders markdown', () => {
    expect(toMarkdownDownload(sampleViewSpec)).toContain(sampleViewSpec.title!);
  });

  describe('toHtmlDownload', () => {
    it('assembles a standalone document carrying the separated stylesheet', () => {
      const doc = toHtmlDownload(sampleViewSpec);
      const { html, css } = renderHTML(sampleViewSpec, { css: 'separate' });

      expect(doc.startsWith('<!DOCTYPE html>')).toBe(true);
      expect(doc).toContain('<meta charset="utf-8">');
      expect(doc).toContain(`<title>${sampleViewSpec.title}</title>`);
      expect(doc).toContain(`<style>${css}</style>`);
      expect(doc).toContain(html);
    });

    it('escapes the title', () => {
      const doc = toHtmlDownload({ ...sampleViewSpec, title: '<script>"x"&' });
      expect(doc).toContain('<title>&lt;script&gt;&quot;x&quot;&amp;</title>');
    });
  });

  describe('developer payloads', () => {
    it('pretty-prints the spec it was handed', () => {
      expect(JSON.parse(toViewSpecJsonDownload(sampleViewSpec))).toEqual(sampleViewSpec);
      expect(toViewSpecJsonDownload(sampleViewSpec)).toContain('\n  ');
    });

    it('dumps the Block Kit text and blocks', () => {
      const { text, blocks } = renderSlack(sampleViewSpec);

      expect(JSON.parse(toBlockKitJsonDownload(sampleViewSpec))).toEqual({ text, blocks });
    });
  });
});
