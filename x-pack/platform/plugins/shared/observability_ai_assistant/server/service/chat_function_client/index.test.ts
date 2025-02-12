/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dedent from 'dedent';
import { ChatFunctionClient, GET_DATA_ON_SCREEN_FUNCTION_NAME } from '.';
import { FunctionVisibility } from '../../../common/functions/types';
import { AdHocInstruction } from '../../../common/types';

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
      const adHocInstructions = client.getAdhocInstructions();

      expect(functions[0]).toEqual({
        definition: {
          description: expect.any(String),
          name: GET_DATA_ON_SCREEN_FUNCTION_NAME,
          parameters: expect.any(Object),
          visibility: FunctionVisibility.AssistantOnly,
        },
        respond: expect.any(Function),
      });

      expect(adHocInstructions[0].text).toContain(
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

  describe('when adhoc instructions are provided', () => {
    let client: ChatFunctionClient;

    beforeEach(() => {
      client = new ChatFunctionClient([]);
    });

    describe('register an adhoc Instruction', () => {
      it('should register a new adhoc instruction', () => {
        const adhocInstruction: AdHocInstruction = {
          text: 'Test adhoc instruction',
          instruction_type: 'application_instruction',
        };

        client.registerAdhocInstruction(adhocInstruction);

        expect(client.getAdhocInstructions()).toContainEqual(adhocInstruction);
      });
    });

    describe('retrieve adHoc instructions', () => {
      it('should return all registered adhoc instructions', () => {
        const firstAdhocInstruction: AdHocInstruction = {
          text: 'First adhoc instruction',
          instruction_type: 'application_instruction',
        };

        const secondAdhocInstruction: AdHocInstruction = {
          text: 'Second adhoc instruction',
          instruction_type: 'application_instruction',
        };

        client.registerAdhocInstruction(firstAdhocInstruction);
        client.registerAdhocInstruction(secondAdhocInstruction);

        const adhocInstructions = client.getAdhocInstructions();

        expect(adhocInstructions).toEqual([firstAdhocInstruction, secondAdhocInstruction]);
      });

      it('should return an empty array if no adhoc instructions are registered', () => {
        const adhocInstructions = client.getAdhocInstructions();

        expect(adhocInstructions).toEqual([]);
      });
    });
  });
});
