import _ from 'lodash';
import $ from 'jquery';
import 'ui/visualize/visualize.less';
import 'ui/visualize/visualize_legend';
import { getUpdateStatus } from 'ui/vis/update_status';
import { dispatchRenderComplete, dispatchRenderStart } from 'ui/render_complete';


const legendPositionToVisContainerClassMap = {
  top: 'vis-container--legend-top',
  bottom: 'vis-container--legend-bottom',
  left: 'vis-container--legend-left',
  right: 'vis-container--legend-right',
};

export class Visualization {
  _showNoResultsMessage(visData) {
    const requiresSearch = _.get(this.vis, 'type.requiresSearch');
    const isZeroHits = _.get(visData, 'hits.total') === 0;

    return Boolean(requiresSearch && isZeroHits);
  }

  _getVisContainerClasses() {
    return legendPositionToVisContainerClassMap[this.vis.params.legendPosition];
  }

  _jQueryGetter(selector) {
    return function () {
      const $sel = $(this.containerElement).find(selector);
      if ($sel.length) return $sel[0];
    };
  }

  constructor(el, vis, uiState) {
    this.vis = vis;

    this.containerElement = el;
    this.containerElement.innerHTML = `
      <div 
        data-test-subj="visualization-error-container" 
        class="text-center visualize-error visualize-chart"
      >
        <div class="item top"></div>
        <div class="item">
          <h2 aria-hidden="true"><i aria-hidden="true" class="fa fa-meh-o"></i></h2>
          <h4>No results found</h4>
        </div>
        <div class="item bottom"></div>
      </div>
      <div
        data-test-subj="visualization-container"
        class="vis-container ${this._getVisContainerClasses()}"
        tabindex="0"
      >
        <span class="kuiScreenReaderOnly" style="display: ${vis.type.isAccessible ? 'none' : 'block'}">
          ${vis.type.title} visualization, not yet accessible
        </span>
        <div aria-hidden="${!vis.type.isAccessible}" class="visualize-chart"></div>
      </div>
    `;

    this.visElement = this._jQueryGetter('.visualize-chart');
    this.visContainer = this._jQueryGetter('.vis-container');

    // TODO: resizeChecker
    // TODO: vis.params watch ?

    // Set the passed in uiState to the vis object. uiState reference should never be changed
    if (!uiState) this.uiState = vis.getUiState();
    else {
      this.uiState = uiState;
      vis._setUiState(uiState);
    }

    const Visualization = vis.type.visualization;
    this.visualization = new Visualization(this.visElement, vis);
  }

  async render(visData) {
    dispatchRenderStart();
    // TODO: check if we got any results and show no result message if not
    // TODO: renderCounter
    // TODO: add legend (or move legend into vislib vis type ?)
    const updateStatus = getUpdateStatus(this.vis, visData);
    return this.visualization.render(visData, updateStatus).then(() => {
      dispatchRenderComplete();
    });
  }

  destroy() {
    this.visualization.destroy();
  }
}
