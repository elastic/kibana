/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useAbortController } from './use_abort_controller';

describe('useAbortController', () => {
  it('should return stable functions', () => {
    const { result, rerender } = renderHook(() => useAbortController());

    const firstRender = result.current;
    rerender();
    const secondRender = result.current;

    expect(firstRender.getAbortController).toBe(secondRender.getAbortController);
    expect(firstRender.abort).toBe(secondRender.abort);
    expect(firstRender.isAborted).toBe(secondRender.isAborted);
    expect(firstRender.isCurrentController).toBe(secondRender.isCurrentController);
  });

  describe('getAbortController', () => {
    it('should create a new AbortController', () => {
      const { result } = renderHook(() => useAbortController());

      const controller = result.current.getAbortController();

      expect(controller).toBeInstanceOf(AbortController);
      expect(controller.signal.aborted).toBe(false);
    });

    it('should abort previous controller when creating a new one', () => {
      const { result } = renderHook(() => useAbortController());

      const firstController = result.current.getAbortController();
      expect(firstController.signal.aborted).toBe(false);

      const secondController = result.current.getAbortController();
      expect(firstController.signal.aborted).toBe(true);
      expect(secondController.signal.aborted).toBe(false);
      expect(firstController).not.toBe(secondController);
    });

    it('should return different controllers on each call', () => {
      const { result } = renderHook(() => useAbortController());

      const controller1 = result.current.getAbortController();
      const controller2 = result.current.getAbortController();

      expect(controller1).not.toBe(controller2);
    });
  });

  describe('abort', () => {
    it('should abort current controller', () => {
      const { result } = renderHook(() => useAbortController());

      const controller = result.current.getAbortController();
      expect(controller.signal.aborted).toBe(false);

      act(() => {
        result.current.abort();
      });

      expect(controller.signal.aborted).toBe(true);
    });

    it('should handle abort when no controller exists', () => {
      const { result } = renderHook(() => useAbortController());

      expect(() => {
        act(() => {
          result.current.abort();
        });
      }).not.toThrow();
    });

    it('should clear controller after abort', () => {
      const { result } = renderHook(() => useAbortController());

      const controller1 = result.current.getAbortController();
      act(() => {
        result.current.abort();
      });

      // Getting a new controller should work after abort
      const controller2 = result.current.getAbortController();
      expect(controller2).not.toBe(controller1);
      expect(controller2.signal.aborted).toBe(false);
    });
  });

  describe('isAborted', () => {
    it('should return false for non-aborted controller', () => {
      const { result } = renderHook(() => useAbortController());

      const controller = result.current.getAbortController();
      expect(result.current.isAborted(controller)).toBe(false);
    });

    it('should return true for aborted controller', () => {
      const { result } = renderHook(() => useAbortController());

      const controller = result.current.getAbortController();
      act(() => {
        result.current.abort();
      });

      expect(result.current.isAborted(controller)).toBe(true);
    });

    it('should return true for controller aborted via signal', () => {
      const { result } = renderHook(() => useAbortController());

      const controller = result.current.getAbortController();
      controller.abort();

      expect(result.current.isAborted(controller)).toBe(true);
    });
  });

  describe('isCurrentController', () => {
    it('should return true for current controller', () => {
      const { result } = renderHook(() => useAbortController());

      const controller = result.current.getAbortController();
      expect(result.current.isCurrentController(controller)).toBe(true);
    });

    it('should return false for previous controller', () => {
      const { result } = renderHook(() => useAbortController());

      const controller1 = result.current.getAbortController();
      const controller2 = result.current.getAbortController();

      expect(result.current.isCurrentController(controller1)).toBe(false);
      expect(result.current.isCurrentController(controller2)).toBe(true);
    });

    it('should return false after abort', () => {
      const { result } = renderHook(() => useAbortController());

      const controller = result.current.getAbortController();
      act(() => {
        result.current.abort();
      });

      expect(result.current.isCurrentController(controller)).toBe(false);
    });
  });

  describe('cleanup on unmount', () => {
    it('should abort controller on unmount', () => {
      const { result, unmount } = renderHook(() => useAbortController());

      const controller = result.current.getAbortController();
      expect(controller.signal.aborted).toBe(false);

      unmount();

      expect(controller.signal.aborted).toBe(true);
    });

    it('should handle unmount when no controller exists', () => {
      const { unmount } = renderHook(() => useAbortController());

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});
