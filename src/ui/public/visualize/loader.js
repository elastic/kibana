import $ from 'jquery';

export function VisualizeLoaderProvider($compile, $rootScope, savedVisualizations) {
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
    return visEl;
  };

  return {
    embedVisualizationWithId: (el, savedVisualizationId, params) => {
      return new Promise((resolve) => {
        savedVisualizations.get(savedVisualizationId).then(savedObj => {
          const element = renderVis(el, savedObj, params);
          resolve(element);
        });
      });
    },
    embedVisualizationWithSavedObject: (el, savedObj, params) => {
      return renderVis(el, savedObj, params);
    }
  };
}
