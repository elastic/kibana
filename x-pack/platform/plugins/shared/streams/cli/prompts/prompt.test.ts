/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('prompt utilities', () => {
  describe('module exports', () => {
    it('exports expected functions', async () => {
      const promptModule = await import('./prompt');

      expect(typeof promptModule.confirm).toBe('function');
      expect(typeof promptModule.input).toBe('function');
      expect(typeof promptModule.select).toBe('function');
      expect(typeof promptModule.multiSelect).toBe('function');
      expect(typeof promptModule.closePrompt).toBe('function');
      expect(typeof promptModule.readStdin).toBe('function');
      expect(typeof promptModule.readJsonInput).toBe('function');
    });
  });

  describe('readJsonInput()', () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'streams-cli-test-'));
    });

    afterAll(async () => {
      await fs.rm(tempDir, { recursive: true });
    });

    it('reads and parses JSON from a file', async () => {
      const { readJsonInput } = await import('./prompt');

      const testData = { name: 'test', count: 42, nested: { foo: 'bar' } };
      const filePath = path.join(tempDir, 'test-input.json');
      await fs.writeFile(filePath, JSON.stringify(testData));

      const result = await readJsonInput(filePath);

      expect(result).toEqual(testData);
    });

    it('handles arrays in JSON files', async () => {
      const { readJsonInput } = await import('./prompt');

      const testData = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const filePath = path.join(tempDir, 'test-array.json');
      await fs.writeFile(filePath, JSON.stringify(testData));

      const result = await readJsonInput(filePath);

      expect(result).toEqual(testData);
    });

    it('handles pretty-printed JSON', async () => {
      const { readJsonInput } = await import('./prompt');

      const testData = { stream: { ingest: { routing: [] } } };
      const filePath = path.join(tempDir, 'test-pretty.json');
      await fs.writeFile(filePath, JSON.stringify(testData, null, 2));

      const result = await readJsonInput(filePath);

      expect(result).toEqual(testData);
    });

    it('throws error for invalid JSON', async () => {
      const { readJsonInput } = await import('./prompt');

      const filePath = path.join(tempDir, 'test-invalid.json');
      await fs.writeFile(filePath, '{ invalid json }');

      await expect(readJsonInput(filePath)).rejects.toThrow(SyntaxError);
    });

    it('throws error for non-existent file', async () => {
      const { readJsonInput } = await import('./prompt');

      const filePath = path.join(tempDir, 'non-existent.json');

      await expect(readJsonInput(filePath)).rejects.toThrow();
    });

    it('handles empty JSON object', async () => {
      const { readJsonInput } = await import('./prompt');

      const filePath = path.join(tempDir, 'test-empty.json');
      await fs.writeFile(filePath, '{}');

      const result = await readJsonInput(filePath);

      expect(result).toEqual({});
    });

    it('handles JSON with unicode characters', async () => {
      const { readJsonInput } = await import('./prompt');

      const testData = { name: '日本語テスト', emoji: '🚀' };
      const filePath = path.join(tempDir, 'test-unicode.json');
      await fs.writeFile(filePath, JSON.stringify(testData));

      const result = await readJsonInput(filePath);

      expect(result).toEqual(testData);
    });
  });

  describe('closePrompt()', () => {
    it('does not throw when called without an active readline interface', async () => {
      // Reset modules to ensure clean state
      jest.resetModules();
      const { closePrompt } = await import('./prompt');

      // Should not throw when there's no active readline
      expect(() => closePrompt()).not.toThrow();

      // Calling multiple times should also not throw
      expect(() => closePrompt()).not.toThrow();
      expect(() => closePrompt()).not.toThrow();
    });
  });
});
