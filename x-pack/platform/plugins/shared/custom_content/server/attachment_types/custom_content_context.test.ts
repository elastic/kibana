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
): Attachment<typeof CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE, CustomContentContextAttachmentData> => ({
  id: 'att-1',
  type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  data,
});

const formatContext = { request: {} as KibanaRequest, spaceId: 'default' };

const getRepresentationValue = async (
  data: CustomContentContextAttachmentData
): Promise<string> => {
  const definition = createCustomContentContextAttachmentType();
  const formatted = definition.format(buildAttachment(data), formatContext);
  const repr = await formatted.getRepresentation!();
  return (repr as { type: 'text'; value: string }).value;
};

describe('createCustomContentContextAttachmentType', () => {
  describe('id', () => {
    it('equals CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE', () => {
      const definition = createCustomContentContextAttachmentType();
      expect(definition.id).toBe(CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE);
    });
  });

  describe('isReadonly', () => {
    it('is true', () => {
      const definition = createCustomContentContextAttachmentType();
      expect(definition.isReadonly).toBe(true);
    });
  });

  describe('validate', () => {
    it('returns valid for a fully-populated input', () => {
      const definition = createCustomContentContextAttachmentType();
      const result = definition.validate({
        panel_template: '<div/>',
        esql_query: 'FROM logs',
        panel_title: 'My Panel',
      });
      expect(result).toEqual({
        valid: true,
        data: { panel_template: '<div/>', esql_query: 'FROM logs', panel_title: 'My Panel' },
      });
    });

    it('returns valid when only panel_template is provided', () => {
      const definition = createCustomContentContextAttachmentType();
      const result = definition.validate({ panel_template: '' });
      expect(result).toEqual({ valid: true, data: { panel_template: '' } });
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
    it('returns a text representation', async () => {
      const value = await getRepresentationValue({ panel_template: '<div/>' });
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });

    it('includes the HTML template in a code fence when template is non-empty', async () => {
      const value = await getRepresentationValue({ panel_template: '<div>hello</div>' });
      expect(value).toContain('```html\n<div>hello</div>\n```');
    });

    it('shows the empty message when panel_template is an empty string', async () => {
      const value = await getRepresentationValue({ panel_template: '' });
      expect(value).toContain('(empty — no template generated yet)');
    });

    it('includes ES|QL query in a code fence when esql_query is provided', async () => {
      const value = await getRepresentationValue({
        panel_template: '<div/>',
        esql_query: 'FROM logs | LIMIT 10',
      });
      expect(value).toContain('ES|QL Query:');
      expect(value).toContain('```esql\nFROM logs | LIMIT 10\n```');
    });

    it('omits ES|QL query section when esql_query is not provided', async () => {
      const value = await getRepresentationValue({ panel_template: '<div/>' });
      expect(value).not.toContain('ES|QL Query:');
    });

    it('getRepresentation returns type "text"', async () => {
      const definition = createCustomContentContextAttachmentType();
      const formatted = definition.format(
        buildAttachment({ panel_template: '<div/>' }),
        formatContext
      );
      const repr = await formatted.getRepresentation!();
      expect(repr.type).toBe('text');
    });
  });

  describe('getAgentDescription', () => {
    it('returns a non-empty string', () => {
      const definition = createCustomContentContextAttachmentType();
      const description = definition.getAgentDescription!();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });
  });

  describe('getTools', () => {
    it('returns an empty array', () => {
      const definition = createCustomContentContextAttachmentType();
      expect(definition.getTools!()).toEqual([]);
    });
  });
});
