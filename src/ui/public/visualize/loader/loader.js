/**
 * IMPORTANT: If you make changes to this API, please make sure to check that
 * the docs (docs/development/visualize/development-create-visualization.asciidoc)
 * are up to date.
 */
import angular from 'angular';
import chrome from '../../chrome';
import '..';
import visTemplate from './loader_template.html';
import { EmbeddedVisualizeHandler } from './embedded_visualize_handler';

/**
 * The parameters accepted by the embedVisualize calls.
 * @typedef {object} VisualizeLoaderParams
 * @property {AppState} appState The appState this visualization should use.
 *    If you don't spyecify it, the global AppState (that is decoded in the URL)
 *    will be used. Usually you don't need to overwrite this, unless you don't
 *    want the visualization to use the global AppState.
 * @property {UiState} uiState The current uiState of the application. If you
 *    don't pass a uiState, the visualization will creates it's own uiState to
 *    store information like whether the legend is open or closed, but you don't
 *    have access to it from the outside. Pass one in if you need that access.
 * @property {object} timeRange An object with a from/to key, that must be
 *    either a date in ISO format, or a valid datetime Elasticsearch expression,
 *    e.g.: { from: 'now-7d/d', to: 'now' }
 * @property {boolean} showSpyPanel Whether or not the spy panel should be available
 *    on this chart. If set to true, spy panels will only be shown if there are
 *    spy panels available for this specific visualization, since not every visualization
 *    supports all spy panels. (default: false)
 * @property {boolean} append If set to true, the visualization will be appended
 *    to the passed element instead of replacing all its content. (default: false)
 * @property {string} cssClass If specified this CSS class (or classes with space separated)
 *    will be set to the root visuzalize element.
 * @property {object} dataAttrs An object of key-value pairs, that will be set
 *    as data-{key}="{value}" attributes on the visualization element.
 */

const VisualizeLoaderProvider = ($compile, $rootScope, savedVisualizations) => {
  const renderVis = (el, savedObj, params) => {
    const scope = $rootScope.$new();
    params = params || {};
    scope.savedObj = savedObj;
    scope.appState = params.appState;
    scope.uiState = params.uiState;
    scope.timeRange = params.timeRange;
    scope.showSpyPanel = params.showSpyPanel;

    const container = angular.element(el);

    const visHtml = $compile(visTemplate)(scope);

    // If params specified cssClass, we will set this to the element.
    if (params.cssClass) {
      visHtml.addClass(params.cssClass);
    }

    // Apply data- attributes to the element if specified
    if (params.dataAttrs) {
      Object.keys(params.dataAttrs).forEach(key => {
        visHtml.attr(`data-${key}`, params.dataAttrs[key]);
      });
    }

    // If params.append was true append instead of replace content
    if (params.append) {
      container.append(visHtml);
    } else {
      container.html(visHtml);
    }

    return new EmbeddedVisualizeHandler(visHtml, scope);
  };

  return {
    /**
     * Renders a saved visualization specified by its id into a DOM element.
     *
     * @param {Element} element The DOM element to render the visualization into.
     *    You can alternatively pass a jQuery element instead.
     * @param {String} id The id of the saved visualization. This is the id of the
     *    saved object that is stored in the .kibana index.
     * @param {VisualizeLoaderParams} params A list of parameters that will influence rendering.
     *
     * @return {Promise.<EmbeddedVisualizeHandler>} A promise that resolves to the
     *    handler for this visualization as soon as the saved object could be found.
     */
    embedVisualizationWithId: async (element, savedVisualizationId, params) => {
      return new Promise((resolve, reject) => {
        savedVisualizations.get(savedVisualizationId).then(savedObj => {
          const handler = renderVis(element, savedObj, params);
          resolve(handler);
        }, reject);
      });
    },
    /**
     * Renders a saved visualization specified by its savedObject into a DOM element.
     * In most of the cases you will need this method, since it allows you to specify
     * filters, handlers, queries, etc. on the savedObject before rendering.
     *
     * @param {Element} element The DOM element to render the visualization into.
     *    You can alternatively pass a jQuery element instead.
     * @param {Object} savedObj The savedObject as it could be retrieved by the
     *    `savedVisualizations` service.
     * @param {VisualizeLoaderParams} params A list of paramters that will influence rendering.
     *
     * @return {EmbeddedVisualizeHandler} The handler to the visualization.
     */
    embedVisualizationWithSavedObject: (el, savedObj, params) => {
      return renderVis(el, savedObj, params);
    },
    /**
     * Returns a promise, that resolves to a list of all saved visualizations.
     *
     * @return {Promise} Resolves with a list of all saved visualizations as
     *    returned by the `savedVisualizations` service in Kibana.
     */
    getVisualizationList: () => {
      return savedVisualizations.find().then(result => result.hits);
    },
  };
};

/**
 * Returns a promise, that resolves with the visualize loader, once it's ready.
 * @return {Promise} A promise, that resolves to the visualize loader.
 */
function getVisualizeLoader() {
  return chrome.dangerouslyGetActiveInjector().then($injector => {
    const Private = $injector.get('Private');
    return Private(VisualizeLoaderProvider);
  });
}

export { getVisualizeLoader, VisualizeLoaderProvider };
