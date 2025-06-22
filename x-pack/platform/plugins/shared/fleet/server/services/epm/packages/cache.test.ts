/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Handlebars from '@kbn/handlebars';

import {
  getPackageAssetsMapCache,
  getPackageInfoCache,
  runWithCache,
  setPackageAssetsMapCache,
  setPackageInfoCache,
  setHandlebarsCompiledTemplateCache,
  getHandlebarsCompiledTemplateCache,
} from './cache';

const PKG_NAME = 'test';
const PKG_VERSION = '1.0.0';

const handlebars = Handlebars.create();

describe('EPM CacheSession', () => {
  describe('outside of a cache session', () => {
    it('should not cache package info', () => {
      setPackageInfoCache(PKG_NAME, PKG_VERSION, {
        name: 'test',
      } as any);
      const cache = getPackageInfoCache(PKG_NAME, PKG_VERSION);
      expect(cache).toBeUndefined();
    });

    it('should not cache assetsMap', () => {
      setPackageAssetsMapCache(PKG_NAME, PKG_VERSION, new Map());
      const cache = getPackageAssetsMapCache(PKG_NAME, PKG_VERSION);
      expect(cache).toBeUndefined();
    });

    it('should not cache handlebars template', () => {
      const template1 = `test1: {{test}}`;
      setHandlebarsCompiledTemplateCache(template1, handlebars.compileAST(template1));
      const cache1 = getHandlebarsCompiledTemplateCache(template1);
      expect(cache1).toBeUndefined();
    });
  });

  describe('in of a cache session', () => {
    it('should cache package info', async () => {
      function setCache() {
        setPackageInfoCache(PKG_NAME, PKG_VERSION, {
          name: 'test',
        } as any);
      }
      function getCache() {
        const cache = getPackageInfoCache(PKG_NAME, PKG_VERSION);
        expect(cache).toEqual({ name: 'test' });
      }

      await runWithCache(async () => {
        setCache();
        getCache();
      });
    });

    it('should cache assetsMap', async () => {
      function setCache() {
        const map = new Map();
        map.set('test.yaml', Buffer.from('name: test'));
        setPackageAssetsMapCache(PKG_NAME, PKG_VERSION, map);
      }
      function getCache() {
        const cache = getPackageAssetsMapCache(PKG_NAME, PKG_VERSION);
        expect(cache).not.toBeUndefined();
        expect(cache?.get('test.yaml')?.toString()).toEqual('name: test');
      }

      await runWithCache(async () => {
        setCache();
        getCache();
      });
    });

    it('should cache handle template', async () => {
      function setCache() {
        const template1 = `test1: {{test}}`;
        setHandlebarsCompiledTemplateCache(template1, handlebars.compileAST(template1));
        const template2 = `test2: {{test}}`;
        setHandlebarsCompiledTemplateCache(template2, handlebars.compileAST(template2));
      }
      function getCache() {
        const template1 = `test1: {{test}}`;
        const cache1 = getHandlebarsCompiledTemplateCache(template1);
        expect(cache1).not.toBeUndefined();
        expect(cache1?.({ test: 'test' })).toEqual(`test1: test`);

        const template2 = `test2: {{test}}`;
        const cache2 = getHandlebarsCompiledTemplateCache(template2);
        expect(cache2).not.toBeUndefined();
        expect(cache2?.({ test: 'test' })).toEqual(`test2: test`);
      }

      await runWithCache(async () => {
        setCache();
        getCache();
      });
    });
  });
});
