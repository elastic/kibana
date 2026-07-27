/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsNames } from './names';
import { getEventBusMappings, getIndexTemplate } from './index_template';

describe('event bus index template', () => {
  const names = getEsNames('.kibana');

  describe('getEventBusMappings', () => {
    const mappings = getEventBusMappings();

    it('keeps payload unindexed to avoid mapping explosion', () => {
      expect(mappings.properties.payload).toEqual({ type: 'object', enabled: false });
    });

    it('does not dynamically map unexpected fields', () => {
      expect(mappings.dynamic).toBe(false);
    });

    it('indexes @timestamp, event.id, event.type, target as sortable/filterable keywords', () => {
      expect(mappings.properties['@timestamp']).toEqual({ type: 'date' });
      expect(mappings.properties.event.properties.id).toEqual({ type: 'keyword' });
      expect(mappings.properties.event.properties.type).toEqual({ type: 'keyword' });
      expect(mappings.properties.target).toEqual({ type: 'keyword' });
    });
  });

  describe('getIndexTemplate', () => {
    interface TemplateShape {
      index_patterns: string[];
      data_stream: { hidden: boolean };
      template: {
        settings: { number_of_shards: number; hidden: boolean; index?: { lifecycle?: unknown } };
        lifecycle: { data_retention: string };
      };
    }

    it('is a hidden, single-shard data stream template targeting the datastream', () => {
      const template = getIndexTemplate(names, '7d') as unknown as TemplateShape;
      expect(template.index_patterns).toEqual([names.dataStream]);
      expect(template.data_stream).toEqual({ hidden: true });
      expect(template.template.settings.number_of_shards).toBe(1);
      expect(template.template.settings.hidden).toBe(true);
    });

    it('uses Data Stream Lifecycle (DSL) retention, not ILM', () => {
      const template = getIndexTemplate(names, '30d') as unknown as TemplateShape;
      expect(template.template.lifecycle).toEqual({ data_retention: '30d' });
      expect(template.template.settings.index?.lifecycle).toBeUndefined();
    });
  });
});
