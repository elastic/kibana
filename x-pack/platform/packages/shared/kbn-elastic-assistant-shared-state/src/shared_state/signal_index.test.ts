/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignalIndexService } from './signal_index';

describe('SignalIndexService', () => {
  it('start returns correct object', () => {
    const service = new SignalIndexService();
    const result = service.start();

    expect(result).toEqual({
      setSignalIndex: expect.any(Function),
      getSignalIndex$: expect.any(Function),
    });
  });

  it('sets and unsets signal index', () => {
    const service = new SignalIndexService();
    const { setSignalIndex, getSignalIndex$ } = service.start();

    const values: Array<string | undefined> = [];
    getSignalIndex$().subscribe((value) => {
      values.push(value);
    });

    // Set signal index values
    setSignalIndex('test-index-1');
    const unset2 = setSignalIndex('test-index-2');

    // Unset the second signal index
    unset2();

    // Check that we got undefined, then our values, then undefined again after unsetting
    expect(values).toEqual([undefined, 'test-index-1', 'test-index-2', undefined]);
  });

  it('handles undefined signal index', () => {
    const service = new SignalIndexService();
    const { setSignalIndex, getSignalIndex$ } = service.start();

    const values: Array<string | undefined> = [];
    getSignalIndex$().subscribe((value) => {
      values.push(value);
    });

    // Set signal index to undefined
    const unset = setSignalIndex(undefined);

    // Unset
    unset();

    // Check that we got undefined throughout
    expect(values).toEqual([undefined, undefined, undefined]);
  });

  it('stops the service correctly', () => {
    const service = new SignalIndexService();
    const { getSignalIndex$ } = service.start();

    let completed = false;
    getSignalIndex$().subscribe({
      complete: () => {
        completed = true;
      },
    });

    service.stop();
    expect(completed).toBe(true);
  });
});
