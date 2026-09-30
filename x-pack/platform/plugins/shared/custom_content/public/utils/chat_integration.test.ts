/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLVariableType } from '@kbn/esql-types';
import {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  MAX_SHORT_FIELD_LENGTH,
} from '../../common/panel_context_attachment';
import { buildCustomContentContextAttachment } from './chat_integration';

describe('buildCustomContentContextAttachment', () => {
  it('carries the panel state and type', () => {
    const attachment = buildCustomContentContextAttachment({
      template: '<div>hi</div>',
      esqlQuery: 'FROM logs',
      embeddableId: 'panel-1',
      panelTitle: 'My panel',
    });

    expect(attachment.type).toBe(CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE);
    expect(attachment.data).toEqual({
      panel_template: '<div>hi</div>',
      esql_query: 'FROM logs',
      panel_title: 'My panel',
      embeddable_id: 'panel-1',
    });
  });

  // Without a stable id each push appends a new attachment, and the update tool reads the first
  // match by type — i.e. the stalest snapshot — instead of the panel's current state.
  it('derives a stable id from the embeddable id so re-pushes replace rather than accumulate', () => {
    const first = buildCustomContentContextAttachment({
      template: '<div>v1</div>',
      esqlQuery: 'FROM logs',
      embeddableId: 'panel-1',
    });
    const second = buildCustomContentContextAttachment({
      template: '<div>v2</div>',
      esqlQuery: 'FROM metrics',
      embeddableId: 'panel-1',
    });

    expect(first.id).toBe(`${CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE}-panel-1`);
    expect(second.id).toBe(first.id);
  });

  it('gives different panels different ids', () => {
    const a = buildCustomContentContextAttachment({ template: '', embeddableId: 'panel-1' });
    const b = buildCustomContentContextAttachment({ template: '', embeddableId: 'panel-2' });

    expect(a.id).not.toBe(b.id);
  });

  it('carries the panel time range so the chat preview matches what the user was looking at', () => {
    const attachment = buildCustomContentContextAttachment({
      template: '<div>hi</div>',
      esqlQuery: 'FROM logs',
      embeddableId: 'panel-1',
      panelTitle: 'My panel',
      fetchContext: { timeRange: { from: 'now-7d', to: 'now' } },
    });

    expect(attachment.data?.time_range).toEqual({ from: 'now-7d', to: 'now' });
  });

  it('omits time_range entirely when the panel has no resolved range', () => {
    const attachment = buildCustomContentContextAttachment({
      template: '<div>hi</div>',
      esqlQuery: 'FROM logs',
      embeddableId: 'panel-1',
    });

    expect(attachment.data).not.toHaveProperty('time_range');
  });

  it('carries the panel height so the preview starts at the size the user saw', () => {
    const attachment = buildCustomContentContextAttachment({
      template: '<div>hi</div>',
      esqlQuery: 'FROM logs',
      embeddableId: 'panel-1',
      panelTitle: 'My panel',
      panelHeight: 480,
      fetchContext: { timeRange: { from: 'now-7d', to: 'now' } },
    });

    expect(attachment.data?.panel_height).toBe(480);
  });

  it('omits panel_height when the panel could not be measured', () => {
    const attachment = buildCustomContentContextAttachment({
      template: '<div>hi</div>',
      esqlQuery: 'FROM logs',
      embeddableId: 'panel-1',
    });

    expect(attachment.data).not.toHaveProperty('panel_height');
  });

  it('carries ES|QL control variables', () => {
    const attachment = buildCustomContentContextAttachment({
      template: '<div>hi</div>',
      esqlQuery: 'FROM logs | WHERE host.name == ?host',
      embeddableId: 'panel-1',
      panelTitle: 'My panel',
      fetchContext: {
        esqlVariables: [{ key: 'host', value: 'host-1', type: ESQLVariableType.VALUES }],
      },
    });

    expect(attachment.data?.esql_variables).toEqual([
      { key: 'host', value: 'host-1', type: ESQLVariableType.VALUES },
    ]);
  });

  it('omits esql_variables when the panel has none', () => {
    const attachment = buildCustomContentContextAttachment({
      template: '<div>hi</div>',
      esqlQuery: 'FROM logs',
      embeddableId: 'panel-1',
      fetchContext: { esqlVariables: [] },
    });

    expect(attachment.data).not.toHaveProperty('esql_variables');
  });

  it('carries the panel fetch context', () => {
    const attachment = buildCustomContentContextAttachment({
      template: '<div>hi</div>',
      esqlQuery: 'FROM logs',
      embeddableId: 'panel-1',
      fetchContext: {
        filters: [{ meta: { key: 'host.name' } }] as never,
        query: { query: 'status:200', language: 'kuery' },
        isApproximate: true,
        projectRouting: 'project-1',
      },
    });

    expect(attachment.data).toMatchObject({
      filters: [{ meta: { key: 'host.name' } }],
      query: { query: 'status:200', language: 'kuery' },
      is_approximate: true,
      project_routing: 'project-1',
    });
  });

  it('omits fetch context the panel does not have', () => {
    const attachment = buildCustomContentContextAttachment({
      template: '<div>hi</div>',
      esqlQuery: 'FROM logs',
      embeddableId: 'panel-1',
    });

    expect(attachment.data).not.toHaveProperty('filters');
    expect(attachment.data).not.toHaveProperty('query');
    expect(attachment.data).not.toHaveProperty('is_approximate');
  });

  it('drops fetch context that would carry an unbounded payload', () => {
    const hugeFilter = {
      meta: {},
      query: { terms: { host: Array.from({ length: 5000 }, (_, i) => `host-${i}`) } },
    };

    const attachment = buildCustomContentContextAttachment({
      template: '<div>hi</div>',
      esqlQuery: 'FROM logs',
      embeddableId: 'panel-1',
      fetchContext: {
        filters: [hugeFilter] as never,
        query: { query: 'status:200', language: 'kuery' },
      },
    });

    expect(attachment.data).not.toHaveProperty('filters');
    expect(attachment.data).toMatchObject({ query: { query: 'status:200', language: 'kuery' } });
  });

  it('truncates an over-long panel title rather than failing validation', () => {
    const attachment = buildCustomContentContextAttachment({
      template: '<div>hi</div>',
      embeddableId: 'panel-1',
      panelTitle: 'a'.repeat(500),
    });

    expect(attachment.data?.panel_title).toHaveLength(MAX_SHORT_FIELD_LENGTH);
  });
});
