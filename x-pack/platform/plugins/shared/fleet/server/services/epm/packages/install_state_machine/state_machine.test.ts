/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAppContextStartContractMock } from '../../../../mocks';
import { appContextService } from '../../..';

import { handleState } from './state_machine';

const getTestDefinition = ({
  mockOnTransition1,
  mockOnTransition2,
  mockOnTransition3,
  context,
  mockPostTransition,
  mockPreTransition,
}: {
  mockOnTransition1: any;
  mockOnTransition2: any;
  mockOnTransition3: any;
  context?: any;
  mockPostTransition?: any;
  mockPreTransition?: any;
}) => {
  return {
    context,
    states: {
      state1: {
        onPreTransition: mockPreTransition,
        onTransition: mockOnTransition1,
        onPostTransition: mockPostTransition,
        nextState: 'state2',
      },
      state2: {
        onPreTransition: mockPreTransition,
        onTransition: mockOnTransition2,
        onPostTransition: mockPostTransition,
        nextState: 'state3',
      },
      state3: {
        onPreTransition: mockPreTransition,
        onTransition: mockOnTransition3,
        onPostTransition: mockPostTransition,
        nextState: 'end',
      },
    },
  };
};

describe('handleState', () => {
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  beforeEach(async () => {
    // prevents `Logger not set.` and other appContext errors
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
  });
  afterEach(() => {
    jest.resetAllMocks();
    appContextService.stop();
  });

  it('should execute all the state machine transitions based on the provided data structure', async () => {
    const mockOnTransition1 = jest.fn();
    const mockOnTransition2 = jest.fn();
    const mockOnTransition3 = jest.fn();
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
    });

    await handleState('state1', testDefinition, testDefinition.context);
    expect(mockOnTransition1).toHaveBeenCalledTimes(1);
    expect(mockOnTransition2).toHaveBeenCalledTimes(1);
    expect(mockOnTransition3).toHaveBeenCalledTimes(1);
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state1 with status: success - nextState: state2'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state2 with status: success - nextState: state3'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state3 with status: success - nextState: end'
    );
  });

  it('should call the onTransition function with context data and the return value is saved for the next iteration', async () => {
    const mockOnTransition1 = jest.fn().mockReturnValue({ arrayData: ['test1', 'test2'] });
    const mockOnTransition2 = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ promiseData: {} }));
    const mockOnTransition3 = jest.fn().mockReturnValue({ lastData: ['test3'] });
    const context = { testData: 'test' };
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      context,
    });

    await handleState('state1', testDefinition, testDefinition.context);
    expect(mockOnTransition1).toHaveBeenCalledWith({ testData: 'test' });
    expect(mockOnTransition2).toHaveBeenCalledWith(
      expect.objectContaining({
        testData: 'test',
        arrayData: ['test1', 'test2'],
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockOnTransition3).toHaveBeenCalledWith(
      expect.objectContaining({
        testData: 'test',
        arrayData: ['test1', 'test2'],
        promiseData: {},
        latestExecutedState: {
          name: 'state2',
          started_at: expect.anything(),
        },
      })
    );

    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state1 with status: success - nextState: state2'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state2 with status: success - nextState: state3'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state3 with status: success - nextState: end'
    );
  });

  it('should save the return data from transitions also when return type is function', async () => {
    const mockOnTransition1 = jest.fn().mockReturnValue({ arrayData: ['test1', 'test2'] });
    const state2Result = () => {
      return {
        result: 'test',
      };
    };
    const mockOnTransition2 = jest.fn().mockImplementation(() => {
      return state2Result;
    });
    const mockOnTransition3 = jest.fn();
    const context = { testData: 'test' };
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      context,
    });

    await handleState('state1', testDefinition, testDefinition.context);
    expect(mockOnTransition1).toHaveBeenCalledWith({ testData: 'test' });
    expect(mockOnTransition2).toHaveBeenCalledWith(
      expect.objectContaining({
        testData: 'test',
        arrayData: ['test1', 'test2'],
        state2Result,
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockOnTransition3).toHaveBeenCalledWith(
      expect.objectContaining({
        testData: 'test',
        arrayData: ['test1', 'test2'],
        state2Result,
        latestExecutedState: {
          name: 'state2',
          started_at: expect.anything(),
        },
      })
    );

    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state1 with status: success - nextState: state2'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state2 with status: success - nextState: state3'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state3 with status: success - nextState: end'
    );
  });

  it('should return updated context data', async () => {
    const mockOnTransition1 = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ promiseData: {} }));
    const state2Result = () => {
      return {
        result: 'test',
      };
    };
    const mockOnTransition2 = jest.fn().mockImplementation(() => {
      return state2Result;
    });
    const mockOnTransition3 = jest.fn().mockReturnValue({ lastData: ['test3'] });
    const context = { testData: 'test' };
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      context,
    });

    const updatedContext = await handleState('state1', testDefinition, testDefinition.context);
    expect(mockOnTransition1).toHaveBeenCalledWith({ testData: 'test' });
    expect(mockOnTransition2).toHaveBeenCalledWith(
      expect.objectContaining({
        testData: 'test',
        promiseData: {},
        state2Result,
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockOnTransition3).toHaveBeenCalledWith(
      expect.objectContaining({
        testData: 'test',
        promiseData: {},
        state2Result,
        latestExecutedState: {
          name: 'state2',
          started_at: expect.anything(),
        },
      })
    );

    expect(updatedContext).toEqual(
      expect.objectContaining({
        testData: 'test',
        promiseData: {},
        state2Result,
        lastData: ['test3'],
        latestExecutedState: {
          name: 'state3',
          started_at: expect.anything(),
        },
      })
    );
  });

  it('should update a variable in the context at every call and return the updated value', async () => {
    const mockOnTransition1 = jest.fn().mockReturnValue({ runningVal: 'test1' });
    const mockOnTransition2 = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ runningVal: 'test2' }));
    const mockOnTransition3 = jest.fn().mockReturnValue({ runningVal: 'test3' });
    const context = { runningVal: [], fixedVal: 'something' };
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      context,
    });

    const updatedContext = await handleState('state1', testDefinition, testDefinition.context);
    expect(mockOnTransition1).toHaveBeenCalledWith({ runningVal: [], fixedVal: 'something' });
    expect(mockOnTransition2).toHaveBeenCalledWith(
      expect.objectContaining({
        runningVal: 'test1',
        fixedVal: 'something',
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockOnTransition3).toHaveBeenCalledWith(
      expect.objectContaining({
        runningVal: 'test2',
        fixedVal: 'something',
        latestExecutedState: {
          name: 'state2',
          started_at: expect.anything(),
        },
      })
    );
    expect(updatedContext).toEqual(
      expect.objectContaining({
        fixedVal: 'something',
        runningVal: 'test3',
        latestExecutedState: {
          name: 'state3',
          started_at: expect.anything(),
        },
      })
    );
  });

  it('should execute the transition starting from the provided state', async () => {
    const mockOnTransition1 = jest.fn().mockReturnValue({ runningVal: 'test1' });
    const mockOnTransition2 = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ runningVal: 'test2' }));
    const mockOnTransition3 = jest.fn().mockReturnValue({ runningVal: 'test3' });
    const context = { runningVal: [], fixedVal: 'something' };
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      context,
    });

    const updatedContext = await handleState('state2', testDefinition, testDefinition.context);

    expect(mockOnTransition1).toHaveBeenCalledTimes(0);
    expect(mockOnTransition2).toHaveBeenCalledWith(
      expect.objectContaining({
        runningVal: [],
        fixedVal: 'something',
      })
    );
    expect(mockOnTransition3).toHaveBeenCalledWith(
      expect.objectContaining({
        runningVal: 'test2',
        fixedVal: 'something',
        latestExecutedState: {
          name: 'state2',
          started_at: expect.anything(),
        },
      })
    );
    expect(updatedContext).toEqual(
      expect.objectContaining({
        fixedVal: 'something',
        runningVal: 'test3',
        latestExecutedState: {
          name: 'state3',
          started_at: expect.anything(),
        },
      })
    );
  });

  it('should throw and return updated context with latest error when a state returns error', async () => {
    const error = new Error('Installation failed');
    const mockOnTransition1 = jest.fn().mockRejectedValue(error);
    const mockOnTransition2 = jest.fn();
    const mockOnTransition3 = jest.fn();
    const context = { fixedVal: 'something' };
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      context,
    });
    const promise = handleState('state1', testDefinition, testDefinition.context);
    await expect(promise).rejects.toThrowError('Installation failed');

    expect(mockOnTransition1).toHaveBeenCalledTimes(1);
    expect(mockOnTransition2).toHaveBeenCalledTimes(0);
    expect(mockOnTransition3).toHaveBeenCalledTimes(0);
    expect(mockContract.logger?.warn).toHaveBeenCalledWith(
      'Error during execution of state "state1" with status "failed": Installation failed'
    );
  });

  it('should execute preTransition function before the transition gets executed', async () => {
    const mockOnTransition1 = jest.fn();
    const mockOnTransition2 = jest.fn();
    const mockOnTransition3 = jest.fn();
    const mockPreTransition = jest.fn();
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      mockPreTransition,
    });
    await handleState('state1', testDefinition, testDefinition.context);

    expect(mockPreTransition).toHaveBeenCalled();
    expect(mockOnTransition1).toHaveBeenCalled();
  });

  it('should execute preTransition function before the transition gets executed passing the updated context', async () => {
    const mockPreTransition = jest.fn().mockReturnValue({ runningVal: 'test1' });
    const mockOnTransition1 = jest.fn();
    const mockOnTransition2 = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ runningVal: 'test2' }));
    const mockOnTransition3 = jest.fn().mockReturnValue({ runningVal: 'test3' });
    const context = { fixedVal: 'something' };
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      mockPreTransition,
      context,
    });
    const updatedContext = await handleState('state1', testDefinition, testDefinition.context);

    expect(updatedContext).toEqual(
      expect.objectContaining({
        fixedVal: 'something',
        runningVal: 'test3',
        latestExecutedState: {
          name: 'state3',
          started_at: expect.anything(),
        },
      })
    );
  });

  it('should throw error and not execute subsequent transitions when onPreTransition throws error', async () => {
    const error = new Error('Precondition failed');
    const mockPreTransition = jest.fn().mockRejectedValue(error);
    const mockOnTransition1 = jest.fn();
    const mockOnTransition2 = jest.fn();

    const mockOnTransition3 = jest.fn();
    const context = { fixedVal: 'something' };
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      mockPreTransition,
      context,
    });

    await expect(
      handleState('state1', testDefinition, testDefinition.context)
    ).rejects.toThrowError('Precondition failed');

    expect(mockPreTransition).toHaveBeenCalled();
    expect(mockOnTransition1).not.toHaveBeenCalled();
    expect(mockOnTransition2).not.toHaveBeenCalled();
    expect(mockOnTransition3).not.toHaveBeenCalled();
  });

  it('should execute postTransition function after the transition is complete', async () => {
    const mockOnTransition1 = jest.fn();
    const mockOnTransition2 = jest.fn();
    const mockOnTransition3 = jest.fn();
    const mockPostTransition = jest.fn();
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      mockPostTransition,
    });
    await handleState('state1', testDefinition, testDefinition.context);

    expect(mockOnTransition1).toHaveBeenCalled();
    expect(mockPostTransition).toHaveBeenCalled();
    expect(mockOnTransition2).toHaveBeenCalled();
    expect(mockPostTransition).toHaveBeenCalled();
    expect(mockOnTransition3).toHaveBeenCalled();
    expect(mockPostTransition).toHaveBeenCalled();
  });

  it('should execute postTransition function after the transition passing the updated context', async () => {
    const mockOnTransition1 = jest.fn().mockReturnValue({ runningVal: 'test1' });
    const mockOnTransition2 = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ runningVal: 'test2' }));
    const mockOnTransition3 = jest.fn().mockReturnValue({ runningVal: 'test3' });
    const mockPostTransition = jest.fn();
    const context = { fixedVal: 'something' };
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      context,
      mockPostTransition,
    });
    const updatedContext = await handleState('state1', testDefinition, testDefinition.context);

    expect(mockOnTransition1).toHaveBeenCalled();
    expect(mockPostTransition).toHaveBeenCalled();
    expect(mockOnTransition2).toHaveBeenCalled();
    expect(mockPostTransition).toHaveBeenCalled();
    expect(mockOnTransition3).toHaveBeenCalled();
    expect(updatedContext).toEqual(
      expect.objectContaining({
        fixedVal: 'something',
        runningVal: 'test3',
        latestExecutedState: {
          name: 'state3',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockPostTransition).toHaveBeenCalledWith(updatedContext);
  });

  it('should execute postTransition correctly also when a transition throws', async () => {
    const error = new Error('Installation failed');
    const mockOnTransition1 = jest.fn().mockReturnValue({ result1: 'test' });
    const mockOnTransition2 = jest.fn().mockRejectedValue(error);
    const mockOnTransition3 = jest.fn();
    const mockPostTransition = jest.fn();
    const context = { testData: 'test' };
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      context,
      mockPostTransition,
    });
    const promise = handleState('state1', testDefinition, testDefinition.context);
    await expect(promise).rejects.toThrowError('Installation failed');

    expect(mockOnTransition1).toHaveBeenCalledTimes(1);
    expect(mockPostTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        result1: 'test',
        testData: 'test',
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
          error:
            'Error during execution of state "state2" with status "failed": Installation failed',
        },
      })
    );
    expect(mockOnTransition2).toHaveBeenCalledTimes(1);
    expect(mockPostTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        result1: 'test',
        testData: 'test',
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockOnTransition3).toHaveBeenCalledTimes(0);
  });

  it('should log a warning when postTransition exits with errors and continue executing the states', async () => {
    const error = new Error('Installation failed');
    const mockOnTransition1 = jest.fn().mockReturnValue({ result1: 'test' });
    const mockOnTransition2 = jest.fn();
    const mockOnTransition3 = jest.fn();
    const mockPostTransition = jest.fn().mockRejectedValue(error);
    const context = { testData: 'test' };
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      context,
      mockPostTransition,
    });
    const updatedContext = await handleState('state1', testDefinition, testDefinition.context);

    expect(mockOnTransition1).toHaveBeenCalledTimes(1);
    expect(mockPostTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        result1: 'test',
        testData: 'test',
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockOnTransition2).toHaveBeenCalledTimes(1);
    expect(mockOnTransition3).toHaveBeenCalledTimes(1);
    expect(mockContract.logger?.warn).toHaveBeenCalledWith(
      'Error during execution of post transition function: Installation failed'
    );

    expect(updatedContext).toEqual(
      expect.objectContaining({
        testData: 'test',
        result1: 'test',
        latestExecutedState: {
          name: 'state3',
          started_at: expect.anything(),
        },
      })
    );
  });

  it('should exit and log a warning when the provided OnTransition is not a function', async () => {
    const mockOnTransition1 = jest.fn().mockReturnValue({ result1: 'test' });
    const mockOnTransition2 = undefined;
    const mockOnTransition3 = jest.fn();

    const context = { testData: 'test' };
    const testDefinition = getTestDefinition({
      mockOnTransition1,
      mockOnTransition2,
      mockOnTransition3,
      context,
    });
    const updatedContext = await handleState('state1', testDefinition, testDefinition.context);

    expect(mockOnTransition1).toHaveBeenCalledTimes(1);
    expect(mockOnTransition3).toHaveBeenCalledTimes(0);
    expect(mockContract.logger?.warn).toHaveBeenCalledWith(
      'Execution of state "state2" with status "failed": provided onTransition is not a valid function'
    );

    expect(updatedContext).toEqual(
      expect.objectContaining({
        testData: 'test',
        result1: 'test',
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
  });
});
