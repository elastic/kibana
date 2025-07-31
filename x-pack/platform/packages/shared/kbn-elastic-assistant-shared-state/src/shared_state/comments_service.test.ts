/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentsService, CommentServiceActions } from './comments_service';
import { ClientMessage } from '@kbn/elastic-assistant';
import { MountPoint } from '@kbn/core-mount-utils-browser';

describe('CommentsService', () => {
  it('start returns correct object', () => {
    const service = new CommentsService();
    const result = service.start();

    expect(result).toEqual({
      registerActions: expect.any(Function),
      getActions$: expect.any(Function),
    });
  });

  it('registers and unregisters comment service actions', () => {
    const service = new CommentsService();
    const { registerActions, getActions$ } = service.start();

    const values: CommentServiceActions[][] = [];
    getActions$().subscribe((value) => {
      values.push(value);
    });

    // Create mock comment service actions
    const mockMessage = {} as ClientMessage;
    const mockMountPoint = {} as MountPoint;

    const mockActions1: CommentServiceActions = {
      order: 1,
      mount: jest.fn(({ message }) => {
        expect(message).toBe(mockMessage);
        return mockMountPoint;
      }),
    };

    const mockActions2: CommentServiceActions = {
      order: 2,
      mount: jest.fn(() => mockMountPoint),
    };

    // Register the actions
    const unregister1 = registerActions(mockActions1);
    const unregister2 = registerActions(mockActions2);

    // Test the mount function
    const mountPoint = values[2][0].mount({ message: mockMessage });
    expect(mockActions1.mount).toHaveBeenCalledWith({ message: mockMessage });
    expect(mountPoint).toBe(mockMountPoint);

    // Check ordering
    expect(values[0].length).toBe(0);

    expect(values[1].length).toBe(1);
    expect(values[1][0]).toBe(mockActions1);

    expect(values[2].length).toBe(2);
    expect(values[2][0]).toBe(mockActions1);
    expect(values[2][1]).toBe(mockActions2);

    // Unregister first action
    unregister1();
    expect(values[3].length).toBe(1);
    expect(values[3][0]).toBe(mockActions2);

    // Unregister second action
    unregister2();
    expect(values[4].length).toBe(0);
  });

  it('sorts actions by order', () => {
    const service = new CommentsService();
    const { registerActions, getActions$ } = service.start();

    const values: CommentServiceActions[][] = [];
    getActions$().subscribe((value) => {
      values.push(value);
    });

    const mockMountPoint = {} as MountPoint;

    const action3: CommentServiceActions = {
      order: 3,
      mount: jest.fn(() => mockMountPoint),
    };

    const action1: CommentServiceActions = {
      order: 1,
      mount: jest.fn(() => mockMountPoint),
    };

    const action2: CommentServiceActions = {
      order: 2,
      mount: jest.fn(() => mockMountPoint),
    };

    // Register the actions in random order
    registerActions(action3);
    registerActions(action1);
    registerActions(action2);

    // Check that they are sorted by order
    expect(values[3][0]).toBe(action1);
    expect(values[3][1]).toBe(action2);
    expect(values[3][2]).toBe(action3);
  });

  it('stops the service correctly', () => {
    const service = new CommentsService();
    const { getActions$ } = service.start();

    let completed = false;
    getActions$().subscribe({
      complete: () => {
        completed = true;
      },
    });

    service.stop();
    expect(completed).toBe(true);
  });
});
