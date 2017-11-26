import angular from 'angular';
import { uiModules } from 'ui/modules';
import 'ui/visualize';
import visTemplate from './loader_template.html';


/**
 * A handler to the embedded visualization. It offers several methods to interact
 * with the visualization.
 */
class EmbeddedVisualizeHandler {
  constructor(element, scope) {
    this._element = element;
    this._scope = scope;
    this._renderComplete = new Promise(resolve => {
      this._element.on('renderComplete', resolve);
    });
  }

  /**
   * Destroy the underlying Angular scope of the visualization. This should be
   * called whenever you remove the visualization.
   */
  destroy() {
    this._scope.$destroy();
  }

  /**
   * Return the actual DOM element (wrapped in jQuery) of the rendered visualization.
   * This is especially useful if you used `append: true` in the parameters where
   * the visualization will be appended to the specified container.
   */
  get element() {
    return this._element;
  }

  /**
   * Returns a promise, that will resolve (without a value) once the rendering of
   * the visualization has finished.
   *
   * @returns {Promise} Promise, that resolves as soon as the visualization is done rendering.
   */
  onRenderComplete() {
    return this._renderComplete;
  }

  /**
   * This function is a fallback for the previous API of the loader. The embed
   * functions earlier returned a promise, that would resolve with the handler,
   * as soon as the visualization finished rendering.
   * Since most functions don't require the rendering to be finished, the handler
   * can be returned immediately and waiting for the rendering to be completed
   * can now be listened to via the `handler.onRenderComplete()` promise.
   *
   * TODO: Remove this function with 7.0.0.
   */
  then(...args) {
    // TODO: Log a deprecation warning here
    // console.warn('[DEPRECATED] The use of embedVisualizationWith...().then() is deprecated. ' +
    // 'Use embedVisualizationWith...().onRenderComplete().then() instead.');
    return this.onRenderComplete()
      .then(...args)
      .then(() => {
        return { destroy: this._scope.$destroy };
      });
  }
}

const VisualizeLoaderProvider = ($compile, $rootScope, savedVisualizations) => {
  const renderVis = (el, savedObj, params) => {
    const scope = $rootScope.$new();
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
     * @param {Object} params A list of parameters that will influence rendering.
     *    See the `embedVisualizationWithSavedObject` documentation for a list of
     *    all accepted parameters.
     * @return {EmbeddedVisualizeHandler} The handler to the visualization.
     */
    embedVisualizationWithId: async (element, id, params) => {
      return new Promise((resolve) => {
        savedVisualizations.get(id).then(savedObj => {
          renderVis(element, savedObj, params).then(handler => {
            resolve(handler);
          });
        });
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
     * @param {Object} params A list of paramters that will influence rendering.
     * @param {AppState} params.appState The current appState of the application.
     * @param {UiState} params.uiState The current uiState of the application.
     * @param {object} params.timeRange An object with a min/max key, that must be
     *    either a date in ISO format, or a valid datetime Elasticsearch expression,
     *    e.g.: { min: 'now-7d/d', max: 'now' }
     * @param {boolean} params.showSpyPanel Whether or not the spy panel should be available
     *    on this chart. (default: false)
     * @param {boolean} params.append If set to true, the visualization will be appended
     *    to the passed element instead of replacing all its content. (default: false)
     * @param {String} params.cssClass If specified this CSS class (or classes with space separated)
     *    will be set to the root visuzalize element.
     * @param {Object} params.dataAttrs An object of key-value pairs, that will be set
     *    as data-{key}="{value}" attributes on the visualization element.
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

// Setup the visualize loader via uiRoutes.addSetupWork and resolve this promise
// (that is also returned by getVisualizeLoader) once the the visualizeLoader
// could be created.
const visualizeLoaderPromise = new Promise((resolve) => {
  uiModules.get('kibana').run((Private) => {
    const visualizeLoader = Private(VisualizeLoaderProvider);
    resolve(visualizeLoader);
  });
});

/**
 * Returns a promise, that resolves with the visualize loader, once it's ready.
 * @return {Promise} A promise, that resolves to the visualize loader.
 */
function getVisualizeLoader() {
  return visualizeLoaderPromise;
}

export { getVisualizeLoader, VisualizeLoaderProvider };
