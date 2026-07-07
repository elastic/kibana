/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpacesSavedObjectSchemas } from './schemas';

describe('8.8.0', () => {
  describe('only `name` is required', () => {
    it('should not throw an error because no schema fields are currently required', () => {
      expect(() => SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo' })).not.toThrowError();
    });
  });

  describe('name', () => {
    it('should be a string', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[name]: expected value of type [string] but got [number]"`
      );

      expect(() => SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo' })).not.toThrowError();
    });

    it('should be minimum length of 1', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: '' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[name]: value has length [0] but it must have a minimum length of [1]."`
      );

      expect(() => SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo' })).not.toThrowError();
    });
  });

  describe('description', () => {
    it('should be a string', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo', description: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[description]: expected value of type [string] but got [number]"`
      );

      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo', description: 'a' })
      ).not.toThrowError();
    });
  });

  describe('initials', () => {
    it('should be a string', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo', initials: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[initials]: expected value of type [string] but got [number]"`
      );

      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo', initials: 'a' })
      ).not.toThrowError();
    });
  });

  describe('color', () => {
    it('should be a string', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo', color: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[color]: expected value of type [string] but got [number]"`
      );

      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo', color: 'a' })
      ).not.toThrowError();
    });
  });
  describe('disabledFeatures', () => {
    it('should be a string', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo', disabledFeatures: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[disabledFeatures]: expected value of type [array] but got [number]"`
      );

      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo', disabledFeatures: ['a'] })
      ).not.toThrowError();
    });
  });

  describe('imageUrl', () => {
    it('should be a string', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo', imageUrl: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[imageUrl]: expected value of type [string] but got [number]"`
      );

      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo', imageUrl: 'a' })
      ).not.toThrowError();
    });
  });

  describe('_reserved', () => {
    it('should be a boolean', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo', _reserved: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[_reserved]: expected value of type [boolean] but got [number]"`
      );

      expect(() =>
        SpacesSavedObjectSchemas['8.8.0'].validate({ name: 'foo', _reserved: true })
      ).not.toThrowError();
    });
  });
});
