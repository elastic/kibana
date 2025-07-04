/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dedent from 'dedent';
import { ChatFunctionClient } from '.';
import { Logger } from '@kbn/logging';
import { RegisterInstructionCallback } from '../types';
import { GET_DATA_ON_SCREEN_FUNCTION_NAME } from '../../functions/get_data_on_screen';

describe('chatFunctionClient', () => {
  describe('when executing a function with invalid arguments', () => {
    let client: ChatFunctionClient;

    let respondFn: jest.Mock;

    beforeEach(() => {
      respondFn = jest.fn().mockImplementationOnce(async () => {
        return {};
      });

      client = new ChatFunctionClient([]);

      client.registerFunction(
        {
          description: '',
          name: 'myFunction',
          parameters: {
            properties: {
              foo: {
                type: 'string',
              },
            },
            required: ['foo'],
          },
        },
        respondFn
      );
    });

    it('throws an error', async () => {
      await expect(async () => {
        await client.executeFunction({
          chat: jest.fn(),
          name: 'myFunction',
          args: JSON.stringify({
            foo: 0,
          }),
          messages: [],
          signal: new AbortController().signal,
          logger: getLoggerMock(),
          connectorId: 'foo',
          simulateFunctionCalling: false,
        });
      }).rejects.toThrowError(`Function arguments are invalid`);

      expect(respondFn).not.toHaveBeenCalled();
    });
  });

  describe('when providing application context', () => {
    it('exposes a function that returns the requested data', async () => {
      const client = new ChatFunctionClient([
        {
          screenDescription: 'My description',
          data: [
            {
              name: 'my_dummy_data',
              description: 'My dummy data',
              value: [
                {
                  foo: 'bar',
                },
              ],
            },
            {
              name: 'my_other_dummy_data',
              description: 'My other dummy data',
              value: [
                {
                  foo: 'bar',
                },
              ],
            },
          ],
        },
      ]);

      const functions = client.getFunctions();
      const instructions = client.getInstructions();

      expect(functions[0]).toEqual({
        definition: {
          description: expect.any(String),
          name: GET_DATA_ON_SCREEN_FUNCTION_NAME,
          parameters: expect.any(Object),
        },
        respond: expect.any(Function),
      });

      expect(
        (instructions[0] as RegisterInstructionCallback)({
          availableFunctionNames: [GET_DATA_ON_SCREEN_FUNCTION_NAME],
        })
      ).toContain(
        dedent(`my_dummy_data: My dummy data
        my_other_dummy_data: My other dummy data
        `)
      );

      const result = await client.executeFunction({
        chat: jest.fn(),
        name: GET_DATA_ON_SCREEN_FUNCTION_NAME,
        args: JSON.stringify({ data: ['my_dummy_data'] }),
        messages: [],
        signal: new AbortController().signal,
        logger: getLoggerMock(),
        connectorId: 'foo',
        simulateFunctionCalling: false,
      });

      expect(result).toEqual({
        content: [
          {
            name: 'my_dummy_data',
            description: 'My dummy data',
            value: [
              {
                foo: 'bar',
              },
            ],
          },
        ],
      });
    });
  });

  describe('when instructions are provided', () => {
    let client: ChatFunctionClient;

    beforeEach(() => {
      client = new ChatFunctionClient([]);
    });

    describe('register an Instruction', () => {
      it('should register a new  instruction', () => {
        const instruction = 'Test instruction';

        client.registerInstruction(instruction);

        expect(client.getInstructions()).toContainEqual(instruction);
      });
    });

    describe('retrieve instructions', () => {
      it('should return all registered instructions', () => {
        const firstInstruction = 'First instruction';

        const secondInstruction = 'Second instruction';

        client.registerInstruction(firstInstruction);
        client.registerInstruction(secondInstruction);

        const instructions = client.getInstructions();

        expect(instructions).toEqual([firstInstruction, secondInstruction]);
      });

      it('should return an empty array if no instructions are registered', () => {
        const adhocInstructions = client.getInstructions();

        expect(adhocInstructions).toEqual([]);
      });
    });
  });
});

function getLoggerMock() {
  // const consoleOrPassThrough = console.log.bind(console);
  const consoleOrPassThrough = () => {};
  return {
    log: jest.fn().mockImplementation(consoleOrPassThrough),
    error: jest.fn().mockImplementation(consoleOrPassThrough),
    debug: jest.fn().mockImplementation(consoleOrPassThrough),
    trace: jest.fn().mockImplementation(consoleOrPassThrough),
    isLevelEnabled: jest.fn().mockReturnValue(true),
  } as unknown as Logger;
}
