/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { ExpressionValue } from 'src/plugins/expressions';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

declare global {
  interface Window {
    runPipeline: (
      expressions: string,
      context?: ExpressionValue,
      initialContext?: ExpressionValue
    ) => any;
    renderPipelineResponse: (context?: ExpressionValue) => Promise<any>;
  }
}

export type ExpressionResult = any;

export type ExpectExpression = (
  name: string,
  expression: string,
  context?: ExpressionValue,
  initialContext?: ExpressionValue
) => ExpectExpressionHandler;

export interface ExpectExpressionHandler {
  toReturn: (expectedResult: ExpressionResult) => Promise<void>;
  getResponse: () => Promise<ExpressionResult>;
  runExpression: (step?: string, stepContext?: ExpressionValue) => Promise<ExpressionResult>;
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
    context: ExpressionValue = {},
    initialContext: ExpressionValue = {}
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
        stepContext: ExpressionValue = context
      ): Promise<ExpressionResult> => {
        log.debug(`running expression ${step || expression}`);
        return browser.executeAsync<
          ExpressionResult,
          string,
          ExpressionValue & { type: string },
          ExpressionValue
        >(
          (_expression, _currentContext, _initialContext, done) => {
            if (!_currentContext) _currentContext = { type: 'null' };
            if (!_currentContext.type) _currentContext.type = 'null';
            return window
              .runPipeline(_expression, _currentContext, _initialContext)
              .then((expressionResult: any) => {
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
        const result = await browser.executeAsync<any>(
          (_context: ExpressionResult, done: (renderResult: any) => void) =>
            window
              .renderPipelineResponse(_context)
              .then((renderResult: any) => {
                done(renderResult);
                return renderResult;
              })
              .catch((e) => {
                done(e);
                return e;
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
