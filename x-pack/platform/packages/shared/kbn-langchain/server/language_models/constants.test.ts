/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultArguments } from './constants';

describe('getDefaultArguments', () => {
  describe('temperature parameter handling', () => {
    it('returns object without temperature when temperature is undefined (openai)', () => {
      const result = getDefaultArguments('openai', undefined);
      expect(result).toEqual({ n: 1, stop: null });
      expect(result).not.toHaveProperty('temperature');
    });

    it('includes temperature when explicitly set to 0 (openai)', () => {
      const result = getDefaultArguments('openai', 0);
      expect(result).toEqual({ n: 1, stop: null, temperature: 0 });
    });

    it('includes temperature when explicitly set to non-zero value (openai)', () => {
      const result = getDefaultArguments('openai', 0.7);
      expect(result).toEqual({ n: 1, stop: null, temperature: 0.7 });
    });

    it('returns object without temperature when temperature is undefined (bedrock)', () => {
      const result = getDefaultArguments('bedrock', undefined);
      expect(result).toEqual({
        stopSequences: ['\n\nHuman:', '\nObservation:'],
        maxTokens: undefined,
      });
      expect(result).not.toHaveProperty('temperature');
    });

    it('includes temperature when explicitly set (bedrock)', () => {
      const result = getDefaultArguments('bedrock', 0.5);
      expect(result).toEqual({
        stopSequences: ['\n\nHuman:', '\nObservation:'],
        maxTokens: undefined,
        temperature: 0.5,
      });
    });

    it('returns empty object without temperature when temperature is undefined (gemini)', () => {
      const result = getDefaultArguments('gemini', undefined);
      expect(result).toEqual({});
      expect(result).not.toHaveProperty('temperature');
    });

    it('includes temperature when explicitly set (gemini)', () => {
      const result = getDefaultArguments('gemini', 0.3);
      expect(result).toEqual({ temperature: 0.3 });
    });

    it('returns object without temperature when temperature is undefined (no llmType)', () => {
      const result = getDefaultArguments(undefined, undefined);
      expect(result).toEqual({ n: 1, stop: null });
      expect(result).not.toHaveProperty('temperature');
    });

    it('includes temperature when explicitly set (no llmType)', () => {
      const result = getDefaultArguments(undefined, 0.8);
      expect(result).toEqual({ n: 1, stop: null, temperature: 0.8 });
    });
  });

  describe('stop parameter handling', () => {
    it('uses default stop sequences for bedrock when stop is undefined', () => {
      const result = getDefaultArguments('bedrock', undefined, undefined);
      expect(result.stopSequences).toEqual(['\n\nHuman:', '\nObservation:']);
    });

    it('uses provided stop sequences for bedrock', () => {
      const customStop = ['custom', 'stop'];
      const result = getDefaultArguments('bedrock', undefined, customStop);
      expect(result.stopSequences).toEqual(customStop);
    });

    it('uses null stop for openai when stop is undefined', () => {
      const result = getDefaultArguments('openai', undefined, undefined);
      expect(result.stop).toBeNull();
    });

    it('uses provided stop for openai', () => {
      const customStop = ['custom', 'stop'];
      const result = getDefaultArguments('openai', undefined, customStop);
      expect(result.stop).toEqual(customStop);
    });
  });

  describe('maxTokens parameter handling', () => {
    it('includes maxTokens when provided (bedrock)', () => {
      const result = getDefaultArguments('bedrock', undefined, undefined, 1000);
      expect(result.maxTokens).toBe(1000);
    });

    it('maxTokens is undefined when not provided (bedrock)', () => {
      const result = getDefaultArguments('bedrock', undefined);
      expect(result.maxTokens).toBeUndefined();
    });
  });
});
