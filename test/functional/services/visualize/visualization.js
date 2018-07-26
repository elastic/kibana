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

const TEST_SUBJECT_VISUALIZE = 'visualizationLoader';

export function VisualizationProvider({ getService }) {
  const log = getService('log');
  const retry = getService('retry');
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  return new class Visualization {

    /**
     * This method waits for a visualization to finish rendering in case its currently rendering.
     * Every visualization indicates a loading state via an attribute while data is currently fetched
     * and then rendered. This method waits for that attribute to be gone.
     * If you call this method before a visualization started fetching its data, it might return immediately,
     * i.e. it does not wait for the next fetch and render to start.
     *
     * You can pass in a parent element, in which the visualization should be located. The parent element can also be
     * the visualization element itself. If you don't specify a parent element, this method looks for a visualization
     * in body. In case you specify a parent (or use the default) and multiple visualizations are found within that element,
     * this method will throw an error.
     *
     * This method will wait an absolute of 10 seconds for the visualization to finish rendering.
     */
    async waitForRender(parentElement, title = '', { ignoreNonVisualization } = {}) {
      log.debug(`Visualization.waitForRender(${title})`);
      const tag = `waitForRender(${title}):`;
      if (!parentElement) {
        parentElement = await find.byCssSelector('body');
      }
      const testSubj = await parentElement.getAttribute('data-test-subj');
      let vis;
      if (testSubj === TEST_SUBJECT_VISUALIZE) {
        vis = parentElement;
      } else {
        const visualizations = await testSubjects.findAllDescendant(TEST_SUBJECT_VISUALIZE, parentElement);
        if (visualizations.length === 0 && ignoreNonVisualization) {
          log.info(`${tag} element does not contain a visualization, ignoring it`);
          return;
        }
        if (visualizations.length !== 1) {
          throw new Error(`${tag} expects exactly 1 visualization in the specified parent, but found ${visualizations.length}`);
        }
        vis = visualizations[0];
      }
      await retry.try(async () => {
        const renderComplete = await vis.getAttribute('data-render-complete');
        if (renderComplete !== 'disabled' && renderComplete !== 'true') {
          throw new Error(`${tag} visualization has not finished first render`);
        }
        const isLoading = await vis.getAttribute('data-loading');
        if (isLoading !== null) {
          throw new Error(`${tag} visualization is still loading/rendering`);
        }
      });
    }

  };
}
