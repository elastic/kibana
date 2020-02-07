/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';
import {
  ExpressionDataHandler,
  Context,
  RenderId,
} from '../../plugins/kbn_tp_run_pipeline/public/np_ready/types';

type UnWrapPromise<T> = T extends Promise<infer U> ? U : T;
export type ExpressionResult = UnWrapPromise<ReturnType<ExpressionDataHandler['getData']>>;

export type ExpectExpression = (
  name: string,
  expression: string,
  context?: Context,
  initialContext?: Context
) => ExpectExpressionHandler;

export interface ExpectExpressionHandler {
  toReturn: (expectedResult: ExpressionResult) => Promise<void>;
  getResponse: () => Promise<ExpressionResult>;
  runExpression: (step?: string, stepContext?: Context) => Promise<ExpressionResult>;
  steps: {
    toMatchSnapshot: () => Promise<ExpectExpressionHandler>;
  };
  toMatchSnapshot: () => Promise<ExpectExpressionHandler>;
  toMatchScreenshot: () => Promise<ExpectExpressionHandler>;
}

// helper for testing interpreter expressions
export function expectExpressionProvider({
  getService,
  updateBaselines,
}: Pick<FtrProviderContext, 'getService'> & { updateBaselines: boolean }): ExpectExpression {
  const browser = getService('browser');
  const screenshot = getService('screenshots');
  const snapshots = getService('snapshots');
  const log = getService('log');
  const testSubjects = getService('testSubjects');

  /**
   * returns a handler object to test a given expression
   * @name: name of the test
   * @expression: expression to execute
   * @context: context provided to the expression
   * @initialContext: initialContext provided to the expression
   * @returns handler object
   */
  return (
    name: string,
    expression: string,
    context: Context = {},
    initialContext: Context = {}
  ): ExpectExpressionHandler => {
    log.debug(`executing expression ${expression}`);
    const steps = expression.split('|'); // todo: we should actually use interpreter parser and get the ast
    let responsePromise: Promise<ExpressionResult>;

    const handler: ExpectExpressionHandler = {
      /**
       * checks if provided object matches expression result
       * @param result: expected expression result
       * @returns {Promise<void>}
       */
      toReturn: async (expectedResult: ExpressionResult) => {
        const pipelineResponse = await handler.getResponse();
        expect(pipelineResponse).to.eql(expectedResult);
      },
      /**
       * returns expression response
       * @returns {*}
       */
      getResponse: () => {
        if (!responsePromise) responsePromise = handler.runExpression();
        return responsePromise;
      },
      /**
       * runs the expression and returns the result
       * @param step: expression to execute
       * @param stepContext: context to provide to expression
       * @returns {Promise<*>} result of running expression
       */
      runExpression: async (
        step: string = expression,
        stepContext: Context = context
      ): Promise<ExpressionResult> => {
        log.debug(`running expression ${step || expression}`);
        return browser.executeAsync<ExpressionResult>(
          (
            _expression: string,
            _currentContext: Context & { type: string },
            _initialContext: Context,
            done: (expressionResult: ExpressionResult) => void
          ) => {
            if (!_currentContext) _currentContext = { type: 'null' };
            if (!_currentContext.type) _currentContext.type = 'null';
            return window
              .runPipeline(_expression, _currentContext, _initialContext)
              .then(expressionResult => {
                done(expressionResult);
                return expressionResult;
              });
          },
          step,
          stepContext,
          initialContext
        );
      },
      steps: {
        /**
         * does a snapshot comparison between result of every function in the expression and the baseline
         * @returns {Promise<void>}
         */
        toMatchSnapshot: async () => {
          let lastResponse: ExpressionResult;
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            lastResponse = await handler.runExpression(step, lastResponse!);
            const diff = await snapshots.compareAgainstBaseline(
              name + i,
              toSerializable(lastResponse!),
              updateBaselines
            );
            expect(diff).to.be.lessThan(0.05);
          }
          if (!responsePromise) {
            responsePromise = Promise.resolve(lastResponse!);
          }
          return handler;
        },
      },
      /**
       * does a snapshot comparison between result of running the expression and baseline
       * @returns {Promise<void>}
       */
      toMatchSnapshot: async () => {
        const pipelineResponse = await handler.getResponse();
        await snapshots.compareAgainstBaseline(
          name,
          toSerializable(pipelineResponse),
          updateBaselines
        );
        return handler;
      },
      /**
       * does a screenshot comparison between result of rendering expression and baseline
       * @returns {Promise<void>}
       */
      toMatchScreenshot: async () => {
        const pipelineResponse = await handler.getResponse();
        log.debug('starting to render');
        const result = await browser.executeAsync<RenderId>(
          (_context: ExpressionResult, done: (renderResult: RenderId) => void) =>
            window.renderPipelineResponse(_context).then(renderResult => {
              done(renderResult);
              return renderResult;
            }),
          pipelineResponse
        );
        log.debug('response of rendering: ', result);

        const chartEl = await testSubjects.find('pluginChart');
        const percentDifference = await screenshot.compareAgainstBaseline(
          name,
          updateBaselines,
          chartEl
        );
        expect(percentDifference).to.be.lessThan(0.1);
        return handler;
      },
    };

    return handler;
  };

  function toSerializable(response: ExpressionResult) {
    if (response.error) {
      // in case of error, pass through only message to the snapshot
      // as error could be expected and stack trace shouldn't be part of the snapshot
      return response.error.message;
    }
    return response;
  }
}
