import angular from 'angular';
import uiRoutes from 'ui/routes';
import 'ui/visualize';
import visTemplate from './loader_template.html';

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

    // If params.append was true append instead of replace content
    if (params.append) {
      container.append(visHtml);
    } else {
      container.html(visHtml);
    }

    const handler = {
      destroy: scope.$destroy,
      element: visHtml,
    };

    return new Promise((resolve) => {
      visHtml.on('renderComplete', () => {
        resolve(handler);
      });
    });
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
     * @return {Promise} A promise, that will resolve once the visualization finished
     *    rendering with a handler to the visualization.
     *    See the `embedVisualizationWithSavedObject` function for more information.
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
     * @returns {Promise} A promise, that will resolve once the visualization is rendered
     *    with a handler to the visualization. The handler has the following properties:
     *    - handler.destroy: A method that destroys the underlying Angualr scope of
     *          the visualization.
     *    - handler.element: A jQuery wrapped reference to the added vis DOM element.
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
  uiRoutes.addSetupWork((Private) => {
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
