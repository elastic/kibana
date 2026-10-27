/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveCustomContentQuery } from './resolve_custom_content_query';

const STORED = 'FROM logs | STATS count = COUNT(*) BY host';
const GENERATED = 'FROM logs | STATS count = COUNT(*) BY machine.os';
const EXPLICIT = 'FROM logs | LIMIT 5';

describe('resolveCustomContentQuery', () => {
  const generate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    generate.mockResolvedValue(GENERATED);
  });

  describe('new panel', () => {
    it('generates a query when none is given', async () => {
      const result = await resolveCustomContentQuery({
        existingQuery: undefined,
        isNewPanel: true,
        generate,
      });

      expect(generate).toHaveBeenCalledWith([]);
      expect(result).toEqual({ query: GENERATED, isChanging: true });
    });

    it('uses a supplied query without generating', async () => {
      const result = await resolveCustomContentQuery({
        suppliedQuery: EXPLICIT,
        existingQuery: undefined,
        isNewPanel: true,
        generate,
      });

      expect(generate).not.toHaveBeenCalled();
      expect(result).toEqual({ query: EXPLICIT, isChanging: true });
    });

    it('creates a data-free panel when hasData is false', async () => {
      const result = await resolveCustomContentQuery({
        hasData: false,
        existingQuery: undefined,
        isNewPanel: true,
        generate,
      });

      expect(generate).not.toHaveBeenCalled();
      expect(result).toEqual({ query: undefined, isChanging: false });
    });

    it('lets a supplied query win over hasData: false', async () => {
      const result = await resolveCustomContentQuery({
        suppliedQuery: EXPLICIT,
        hasData: false,
        existingQuery: undefined,
        isNewPanel: true,
        generate,
      });

      expect(result.query).toBe(EXPLICIT);
    });

    it('treats a blank supplied query as not supplied', async () => {
      const result = await resolveCustomContentQuery({
        suppliedQuery: '  ',
        existingQuery: undefined,
        isNewPanel: true,
        generate,
      });

      expect(generate).toHaveBeenCalledWith([]);
      expect(result.query).toBe(GENERATED);
    });

    it('propagates a generation failure instead of falling back to a data-free panel', async () => {
      generate.mockRejectedValue(new Error('no suitable index'));

      await expect(
        resolveCustomContentQuery({ existingQuery: undefined, isNewPanel: true, generate })
      ).rejects.toThrow('no suitable index');
    });
  });

  describe('edit of a panel with data', () => {
    const edit = { existingQuery: STORED, isNewPanel: false, generate };

    it('keeps the stored query by default', async () => {
      const result = await resolveCustomContentQuery(edit);

      expect(generate).not.toHaveBeenCalled();
      expect(result).toEqual({ query: STORED, isChanging: false });
    });

    it('keeps the stored query when hasData is true', async () => {
      const result = await resolveCustomContentQuery({ ...edit, hasData: true });

      expect(generate).not.toHaveBeenCalled();
      expect(result).toEqual({ query: STORED, isChanging: false });
    });

    it('replaces the stored query with a supplied one', async () => {
      const result = await resolveCustomContentQuery({ ...edit, suppliedQuery: EXPLICIT });

      expect(result).toEqual({ query: EXPLICIT, isChanging: true });
    });

    it('does not report a change when the supplied query equals the stored one', async () => {
      const result = await resolveCustomContentQuery({ ...edit, suppliedQuery: STORED });

      expect(result).toEqual({ query: STORED, isChanging: false });
    });

    it('keeps the stored query when the supplied query is blank', async () => {
      const result = await resolveCustomContentQuery({ ...edit, suppliedQuery: '' });

      expect(generate).not.toHaveBeenCalled();
      expect(result).toEqual({ query: STORED, isChanging: false });
    });

    it('removes the query when hasData is false', async () => {
      const result = await resolveCustomContentQuery({ ...edit, hasData: false });

      expect(result).toEqual({ query: undefined, isChanging: true });
    });

    it('removes the query when suppliedQuery is null', async () => {
      const result = await resolveCustomContentQuery({ ...edit, suppliedQuery: null });

      expect(result).toEqual({ query: undefined, isChanging: true });
    });

    it('lets a supplied query win over hasData: false', async () => {
      const result = await resolveCustomContentQuery({
        ...edit,
        suppliedQuery: EXPLICIT,
        hasData: false,
      });

      expect(result).toEqual({ query: EXPLICIT, isChanging: true });
    });

    it('regenerates from the stored query when asked to', async () => {
      const result = await resolveCustomContentQuery({ ...edit, regenerate: true });

      expect(generate).toHaveBeenCalledWith([STORED]);
      expect(result).toEqual({ query: GENERATED, isChanging: true });
    });

    it('lets a supplied query win over regenerate', async () => {
      const result = await resolveCustomContentQuery({
        ...edit,
        suppliedQuery: EXPLICIT,
        regenerate: true,
      });

      expect(generate).not.toHaveBeenCalled();
      expect(result.query).toBe(EXPLICIT);
    });

    it('lets hasData: false win over regenerate', async () => {
      const result = await resolveCustomContentQuery({
        ...edit,
        hasData: false,
        regenerate: true,
      });

      expect(generate).not.toHaveBeenCalled();
      expect(result.query).toBeUndefined();
    });
  });

  describe('edit of a panel without data', () => {
    const edit = { existingQuery: undefined, isNewPanel: false, generate };

    it('stays data-free by default', async () => {
      const result = await resolveCustomContentQuery(edit);

      expect(generate).not.toHaveBeenCalled();
      expect(result).toEqual({ query: undefined, isChanging: false });
    });

    it('generates a query when hasData is true', async () => {
      const result = await resolveCustomContentQuery({ ...edit, hasData: true });

      expect(generate).toHaveBeenCalledWith([]);
      expect(result).toEqual({ query: GENERATED, isChanging: true });
    });

    it('generates a query when asked to regenerate', async () => {
      const result = await resolveCustomContentQuery({ ...edit, regenerate: true });

      expect(generate).toHaveBeenCalledWith([]);
      expect(result.query).toBe(GENERATED);
    });
  });
});
