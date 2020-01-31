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

// helper for testing interpreter expressions
export const expectExpressionProvider = ({ getService, updateBaselines }) => {
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
  return (name, expression, context = {}, initialContext = {}) => {
    log.debug(`executing expression ${expression}`);
    const steps = expression.split('|'); // todo: we should actually use interpreter parser and get the ast
    let responsePromise;

    const handler = {
      /**
       * checks if provided object matches expression result
       * @param result: expected expression result
       * @returns {Promise<void>}
       */
      toReturn: async result => {
        const pipelineResponse = await handler.getResponse();
        expect(pipelineResponse).to.eql(result);
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
      runExpression: async (step, stepContext) => {
        log.debug(`running expression ${step || expression}`);
        const promise = browser.executeAsync(
          (expression, context, initialContext, done) => {
            if (!context) context = {};
            if (!context.type) context.type = 'null';
            window.runPipeline(expression, context, initialContext).then(result => {
              done(result);
            });
          },
          step || expression,
          stepContext || context,
          initialContext
        );
        return await promise;
      },
      steps: {
        /**
         * does a snapshot comparison between result of every function in the expression and the baseline
         * @returns {Promise<void>}
         */
        toMatchSnapshot: async () => {
          let lastResponse;
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            lastResponse = await handler.runExpression(step, lastResponse);
            const diff = await snapshots.compareAgainstBaseline(
              name + i,
              lastResponse,
              updateBaselines
            );
            expect(diff).to.be.lessThan(0.05);
          }
          if (!responsePromise) {
            responsePromise = new Promise(resolve => {
              resolve(lastResponse);
            });
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
        await snapshots.compareAgainstBaseline(name, pipelineResponse, updateBaselines);
        return handler;
      },
      /**
       * does a screenshot comparison between result of rendering expression and baseline
       * @returns {Promise<void>}
       */
      toMatchScreenshot: async () => {
        const pipelineResponse = await handler.getResponse();
        const result = await browser.executeAsync((context, done) => {
          window.renderPipelineResponse(context).then(result => {
            done(result);
          });
        }, pipelineResponse);
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
};
