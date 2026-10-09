/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  type CustomContentContextAttachmentData,
} from '../../common/panel_context_attachment';
import { createCustomContentContextAttachmentType } from './custom_content_context';

const buildAttachment = (
  data: CustomContentContextAttachmentData
): Attachment<
  typeof CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  CustomContentContextAttachmentData
> => ({
  id: 'att-1',
  type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  data,
});

const formatContext = { request: {} as KibanaRequest, spaceId: 'default' };

const getRepresentationValue = async (
  data: CustomContentContextAttachmentData
): Promise<string> => {
  const definition = createCustomContentContextAttachmentType();
  const formatted = await definition.format(buildAttachment(data), formatContext);
  const repr = await formatted.getRepresentation!();
  return (repr as { type: 'text'; value: string }).value;
};

describe('createCustomContentContextAttachmentType', () => {
  describe('validate', () => {
    it('returns valid for a fully-populated input', () => {
      const definition = createCustomContentContextAttachmentType();
      const result = definition.validate({
        panel_template: '<div/>',
        esql_query: 'FROM logs',
        panel_title: 'My Panel',
        embeddable_id: 'panel-1',
      });
      expect(result).toEqual({
        valid: true,
        data: {
          panel_template: '<div/>',
          esql_query: 'FROM logs',
          panel_title: 'My Panel',
          embeddable_id: 'panel-1',
        },
      });
    });

    it('returns valid when only required fields are provided', () => {
      const definition = createCustomContentContextAttachmentType();
      const result = definition.validate({ panel_template: '', embeddable_id: 'panel-1' });
      expect(result).toEqual({
        valid: true,
        data: { panel_template: '', embeddable_id: 'panel-1' },
      });
    });

    it('returns invalid when panel_template is missing', () => {
      const definition = createCustomContentContextAttachmentType();
      const result = definition.validate({ esql_query: 'FROM logs' });
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });

    it('returns invalid when panel_template has the wrong type', () => {
      const definition = createCustomContentContextAttachmentType();
      const result = definition.validate({ panel_template: 123 });
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });
  });

  describe('format', () => {
    it('includes the HTML template in a code fence when template is non-empty', async () => {
      const value = await getRepresentationValue({
        panel_template: '<div>hello</div>',
        embeddable_id: 'panel-1',
      });
      expect(value).toContain('```html\n<div>hello</div>\n```');
    });

    it('shows the empty message when panel_template is an empty string', async () => {
      const value = await getRepresentationValue({ panel_template: '', embeddable_id: 'panel-1' });
      expect(value).toContain('(empty — no template generated yet)');
    });

    it('includes ES|QL query in a code fence when esql_query is provided', async () => {
      const value = await getRepresentationValue({
        panel_template: '<div/>',
        esql_query: 'FROM logs | LIMIT 10',
        embeddable_id: 'panel-1',
      });
      expect(value).toContain('ES|QL Query:');
      expect(value).toContain('```esql\nFROM logs | LIMIT 10\n```');
    });

    it('omits ES|QL query section when esql_query is not provided', async () => {
      const value = await getRepresentationValue({
        panel_template: '<div/>',
        embeddable_id: 'panel-1',
      });
      expect(value).not.toContain('ES|QL Query:');
    });
  });
});
