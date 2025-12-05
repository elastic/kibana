/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formReducer, initialFormState, type FormState } from './form_reducer';

describe('formReducer', () => {
  describe('initial state', () => {
    it('should return initial state', () => {
      expect(initialFormState).toEqual({
        selectedTemplate: null,
        streamName: '',
        selectedIndexPattern: '',
      });
    });
  });

  describe('SET_SELECTED_TEMPLATE', () => {
    it('should set selected template', () => {
      const state: FormState = {
        selectedTemplate: null,
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
      };

      const result = formReducer(state, {
        type: 'SET_SELECTED_TEMPLATE',
        payload: 'template-1',
      });

      expect(result).toEqual({
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
      });
    });

    it('should set selected template to null', () => {
      const state: FormState = {
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
      };

      const result = formReducer(state, {
        type: 'SET_SELECTED_TEMPLATE',
        payload: null,
      });

      expect(result).toEqual({
        selectedTemplate: null,
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
      });
    });
  });

  describe('SET_STREAM_NAME', () => {
    it('should set stream name', () => {
      const state: FormState = {
        selectedTemplate: 'template-1',
        streamName: '',
        selectedIndexPattern: 'logs-*',
      };

      const result = formReducer(state, {
        type: 'SET_STREAM_NAME',
        payload: 'my-stream',
      });

      expect(result).toEqual({
        selectedTemplate: 'template-1',
        streamName: 'my-stream',
        selectedIndexPattern: 'logs-*',
      });
    });

    it('should update existing stream name', () => {
      const state: FormState = {
        selectedTemplate: 'template-1',
        streamName: 'old-stream',
        selectedIndexPattern: 'logs-*',
      };

      const result = formReducer(state, {
        type: 'SET_STREAM_NAME',
        payload: 'new-stream',
      });

      expect(result).toEqual({
        selectedTemplate: 'template-1',
        streamName: 'new-stream',
        selectedIndexPattern: 'logs-*',
      });
    });
  });

  describe('SET_SELECTED_INDEX_PATTERN', () => {
    it('should set selected index pattern', () => {
      const state: FormState = {
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: '',
      };

      const result = formReducer(state, {
        type: 'SET_SELECTED_INDEX_PATTERN',
        payload: 'logs-*',
      });

      expect(result).toEqual({
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
      });
    });

    it('should update existing index pattern', () => {
      const state: FormState = {
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
      };

      const result = formReducer(state, {
        type: 'SET_SELECTED_INDEX_PATTERN',
        payload: 'metrics-*',
      });

      expect(result).toEqual({
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'metrics-*',
      });
    });
  });

  describe('RESET_FORM', () => {
    it('should reset all form state to initial values', () => {
      const state: FormState = {
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
      };

      const result = formReducer(state, { type: 'RESET_FORM' });

      expect(result).toEqual(initialFormState);
    });
  });

  describe('RESET_ON_TEMPLATE_CHANGE', () => {
    it('should reset stream name and index pattern but keep selected template', () => {
      const state: FormState = {
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
      };

      const result = formReducer(state, { type: 'RESET_ON_TEMPLATE_CHANGE' });

      expect(result).toEqual({
        selectedTemplate: 'template-1',
        streamName: '',
        selectedIndexPattern: '',
      });
    });
  });

  describe('unknown action', () => {
    it('should return state unchanged for unknown action', () => {
      const state: FormState = {
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
      };

      const result = formReducer(state, { type: 'UNKNOWN_ACTION' } as any);

      expect(result).toEqual(state);
    });
  });
});
