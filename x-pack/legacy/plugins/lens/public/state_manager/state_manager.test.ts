/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { basicStateManager, reducerStateManager } from './state_manager';

describe('state_manager', () => {
  describe('basicStateManager', () => {
    it('should change state when setState is called', () => {
      const manager = basicStateManager('hi');
      expect(manager.getState()).toEqual('hi');
      manager.setState(s => `${s} there`);
      expect(manager.getState()).toEqual('hi there');
    });

    it('should update the observed state on state change', () => {
      const onChange = jest.fn();
      const manager = basicStateManager('hi');
      manager.state$.subscribe(onChange);
      expect(onChange).toHaveBeenCalledWith('hi');
      manager.setState(s => 'you');
      expect(onChange).toHaveBeenCalledWith('you');
    });
  });

  describe('reducerStateManager', () => {
    it('should change state via the reducer', () => {
      const onChange = jest.fn();
      const manager = reducerStateManager('hi', (state, action) => {
        return `${state} + ${action}`;
      });
      manager.state$.subscribe(onChange);
      manager.dispatch('oi!');
      expect(manager.getState()).toEqual('hi + oi!');
      expect(onChange).toHaveBeenCalledWith('hi + oi!');
    });
  });
});
