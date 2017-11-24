import $ from 'jquery';
import uiRoutes from 'ui/routes';
import 'ui/visualize';

const VisualizeLoaderProvider = ($compile, $rootScope, savedVisualizations) => {
  const renderVis = (el, savedObj, params) => {
    const scope = $rootScope.$new();
    scope.savedObj = savedObj;
    scope.appState = params.appState;
    scope.uiState = params.uiState;
    scope.timeRange = params.timeRange;
    scope.showSpyPanel = params.showSpyPanel;
    scope.editorMode = params.editorMode;

    const container = el instanceof $ ? el : $(el);

    container.html('');
    const visEl = $('<visualize saved-obj="savedObj" app-state="appState" ui-state="uiState" ' +
      'time-range="timeRange" editor-mode="editorMode" show-spy-panel="showSpyPanel"></visualize>');
    const visHtml = $compile(visEl)(scope);
    container.html(visHtml);

    const handler = { destroy: scope.$destroy };

    return new Promise((resolve) => {
      visEl.on('renderComplete', () => {
        resolve(handler);
      });
    });

  };

  return {
    embedVisualizationWithId: async (el, savedVisualizationId, params) => {
      return new Promise((resolve) => {
        savedVisualizations.get(savedVisualizationId).then(savedObj => {
          renderVis(el, savedObj, params).then(handler => {
            resolve(handler);
          });
        });
      });
    },
    embedVisualizationWithSavedObject: (el, savedObj, params) => {
      return renderVis(el, savedObj, params);
    },
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
