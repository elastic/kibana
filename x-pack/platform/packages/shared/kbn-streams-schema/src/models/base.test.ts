/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseStream } from './base';

describe('BaseStream', () => {
  describe('Definition', () => {
    it('is valid without optional title and tags', () => {
      const definition: BaseStream.Definition = {
        name: 'my-stream',
        description: 'A test stream',
        updated_at: new Date().toISOString(),
      };

      expect(BaseStream.Definition.is(definition)).toBe(true);
      expect(BaseStream.Definition.right.parse(definition)).toEqual(definition);
    });

    it('is valid with title', () => {
      const definition: BaseStream.Definition = {
        name: 'my-stream',
        description: 'A test stream',
        updated_at: new Date().toISOString(),
        title: 'My Custom Stream Title',
      };

      expect(BaseStream.Definition.is(definition)).toBe(true);
      expect(BaseStream.Definition.right.parse(definition)).toEqual(definition);
    });

    it('is valid with tags', () => {
      const definition: BaseStream.Definition = {
        name: 'my-stream',
        description: 'A test stream',
        updated_at: new Date().toISOString(),
        tags: ['nginx', 'production', 'access-logs'],
      };

      expect(BaseStream.Definition.is(definition)).toBe(true);
      expect(BaseStream.Definition.right.parse(definition)).toEqual(definition);
    });

    it('is valid with both title and tags', () => {
      const definition: BaseStream.Definition = {
        name: 'logs.nginx',
        description: 'Nginx access logs from production servers',
        updated_at: new Date().toISOString(),
        title: 'Production NGINX Access Logs',
        tags: ['nginx', 'production', 'access-logs'],
      };

      expect(BaseStream.Definition.is(definition)).toBe(true);
      expect(BaseStream.Definition.right.parse(definition)).toEqual(definition);
    });

    it('is valid with empty tags array', () => {
      const definition: BaseStream.Definition = {
        name: 'my-stream',
        description: 'A test stream',
        updated_at: new Date().toISOString(),
        tags: [],
      };

      expect(BaseStream.Definition.is(definition)).toBe(true);
      expect(BaseStream.Definition.right.parse(definition)).toEqual(definition);
    });

    it('is valid with empty title string', () => {
      const definition: BaseStream.Definition = {
        name: 'my-stream',
        description: 'A test stream',
        updated_at: new Date().toISOString(),
        title: '',
      };

      expect(BaseStream.Definition.is(definition)).toBe(true);
      expect(BaseStream.Definition.right.parse(definition)).toEqual(definition);
    });

    it('is not valid with non-string title', () => {
      const definition = {
        name: 'my-stream',
        description: 'A test stream',
        updated_at: new Date().toISOString(),
        title: 123,
      };

      expect(BaseStream.Definition.is(definition as any)).toBe(false);
    });

    it('is not valid with non-array tags', () => {
      const definition = {
        name: 'my-stream',
        description: 'A test stream',
        updated_at: new Date().toISOString(),
        tags: 'single-tag',
      };

      expect(BaseStream.Definition.is(definition as any)).toBe(false);
    });

    it('is not valid with non-string elements in tags array', () => {
      const definition = {
        name: 'my-stream',
        description: 'A test stream',
        updated_at: new Date().toISOString(),
        tags: ['valid-tag', 123, 'another-tag'],
      };

      expect(BaseStream.Definition.is(definition as any)).toBe(false);
    });
  });
});
