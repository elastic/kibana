import $ from 'jquery';

export function VisualizeLoaderProvider($compile, $rootScope, savedVisualizations) {
  return (el, savedVisualizationId, timeRange, appState, uiState) => {
    savedVisualizations.get(savedVisualizationId).then(savedObj => {
      const scope = $rootScope.$new();
      scope.savedObj = savedObj;
      scope.appState = appState;
      scope.uiState = uiState;
      scope.timeRange = timeRange;

      $(el).html('');
      const visEl = $('<visualize saved-obj="savedObj" app-state="appState" ui-state="uiState" time-range="timeRange"></visualize>');
      const visHtml = $compile(visEl)(scope);
      $(el).html(visHtml);
      return visEl[0];
    });
  };
}
