/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toExpression } from './embeddable';
import { EmbeddableInput } from '../../../../types';
import { decode } from '../../../../common/lib/embeddable_dataurl';
import { fromExpression } from '@kbn/interpreter';

describe('toExpression', () => {
  describe('by-reference embeddable input', () => {
    const baseEmbeddableInput = {
      id: 'elementId',
      savedObjectId: 'embeddableId',
      filters: [],
    };

    it('converts to an embeddable expression', () => {
      const input: EmbeddableInput = baseEmbeddableInput;

      const expression = toExpression(input, 'visualization');
      const ast = fromExpression(expression);

      expect(ast.type).toBe('expression');
      expect(ast.chain[0].function).toBe('embeddable');
      expect(ast.chain[0].arguments.type[0]).toBe('visualization');

      const config = decode(ast.chain[0].arguments.config[0] as string);

      expect(config.savedObjectId).toStrictEqual(input.savedObjectId);
    });

    it('includes optional input values', () => {
      const input: EmbeddableInput = {
        ...baseEmbeddableInput,
        title: 'title',
        timeRange: {
          from: 'now-1h',
          to: 'now',
        },
      };

      const expression = toExpression(input, 'visualization');
      const ast = fromExpression(expression);

      const config = decode(ast.chain[0].arguments.config[0] as string);

      expect(config).toHaveProperty('title', input.title);
      expect(config).toHaveProperty('timeRange');
      expect(config.timeRange).toHaveProperty('from', input.timeRange?.from);
      expect(config.timeRange).toHaveProperty('to', input.timeRange?.to);
    });

    it('includes empty panel title', () => {
      const input: EmbeddableInput = {
        ...baseEmbeddableInput,
        title: '',
      };

      const expression = toExpression(input, 'visualization');
      const ast = fromExpression(expression);

      const config = decode(ast.chain[0].arguments.config[0] as string);

      expect(config).toHaveProperty('title', input.title);
    });
  });

  describe('by-value embeddable input', () => {
    const baseEmbeddableInput = {
      id: 'elementId',
      disableTriggers: true,
      filters: [],
    };
    it('converts to an embeddable expression', () => {
      const input: EmbeddableInput = baseEmbeddableInput;

      const expression = toExpression(input, 'visualization');
      const ast = fromExpression(expression);

      expect(ast.type).toBe('expression');
      expect(ast.chain[0].function).toBe('embeddable');
      expect(ast.chain[0].arguments.type[0]).toBe('visualization');

      const config = decode(ast.chain[0].arguments.config[0] as string);
      expect(config.filters).toStrictEqual(input.filters);
      expect(config.disableTriggers).toStrictEqual(input.disableTriggers);
    });

    it('includes optional input values', () => {
      const input: EmbeddableInput = {
        ...baseEmbeddableInput,
        title: 'title',
        timeRange: {
          from: 'now-1h',
          to: 'now',
        },
      };

      const expression = toExpression(input, 'visualization');
      const ast = fromExpression(expression);

      const config = decode(ast.chain[0].arguments.config[0] as string);

      expect(config).toHaveProperty('title', input.title);
      expect(config).toHaveProperty('timeRange');
      expect(config.timeRange).toHaveProperty('from', input.timeRange?.from);
      expect(config.timeRange).toHaveProperty('to', input.timeRange?.to);
    });

    it('includes empty panel title', () => {
      const input: EmbeddableInput = {
        ...baseEmbeddableInput,
        title: '',
      };

      const expression = toExpression(input, 'visualization');
      const ast = fromExpression(expression);

      const config = decode(ast.chain[0].arguments.config[0] as string);

      expect(config).toHaveProperty('title', input.title);
    });
  });
});
