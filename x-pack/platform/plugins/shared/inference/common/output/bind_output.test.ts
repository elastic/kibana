/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BoundOutputOptions, OutputAPI, UnboundOutputOptions } from '@kbn/inference-common';
import { bindOutput } from './bind_output';

describe('createScopedOutputAPI', () => {
  let chatComplete: OutputAPI & jest.MockedFn<OutputAPI>;

  beforeEach(() => {
    chatComplete = jest.fn();
  });

  it('calls chatComplete with both bound and unbound params', async () => {
    const bound: BoundOutputOptions = {
      connectorId: 'some-id',
      functionCalling: 'native',
    };

    const unbound: UnboundOutputOptions = {
      id: 'foo',
      input: 'hello there',
    };

    const boundApi = bindOutput(chatComplete, bound);

    await boundApi({ ...unbound });

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledWith({
      ...bound,
      ...unbound,
    });
  });

  it('forwards the response from chatComplete', async () => {
    const expectedReturnValue = Symbol('something');
    chatComplete.mockResolvedValue(expectedReturnValue as any);

    const boundApi = bindOutput(chatComplete, { connectorId: 'my-connector' });

    const result = await boundApi({
      id: 'foo',
      input: 'hello there',
    });

    expect(result).toEqual(expectedReturnValue);
  });

  it('only passes the expected parameters from the bound param object', async () => {
    const bound = {
      connectorId: 'some-id',
      functionCalling: 'native',
      foo: 'bar',
    } as BoundOutputOptions;

    const unbound: UnboundOutputOptions = {
      id: 'foo',
      input: 'hello there',
    };

    const boundApi = bindOutput(chatComplete, bound);

    await boundApi({ ...unbound });

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledWith({
      connectorId: 'some-id',
      functionCalling: 'native',
      id: 'foo',
      input: 'hello there',
    });
  });

  it('ignores mutations of the bound parameters after binding', async () => {
    const bound: BoundOutputOptions = {
      connectorId: 'some-id',
      functionCalling: 'native',
    };

    const unbound: UnboundOutputOptions = {
      id: 'foo',
      input: 'hello there',
    };

    const boundApi = bindOutput(chatComplete, bound);

    bound.connectorId = 'some-other-id';

    await boundApi({ ...unbound });

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledWith({
      connectorId: 'some-id',
      functionCalling: 'native',
      id: 'foo',
      input: 'hello there',
    });
  });

  it('does not allow overriding bound parameters with the unbound object', async () => {
    const bound: BoundOutputOptions = {
      connectorId: 'some-id',
      functionCalling: 'native',
    };

    const unbound = {
      id: 'foo',
      input: 'hello there',
      connectorId: 'overridden',
    } as UnboundOutputOptions;

    const boundApi = bindOutput(chatComplete, bound);

    await boundApi({ ...unbound });

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledWith({
      connectorId: 'some-id',
      functionCalling: 'native',
      id: 'foo',
      input: 'hello there',
    });
  });
});
