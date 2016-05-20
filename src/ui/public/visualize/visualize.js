import 'ui/visualize/spy';
import 'ui/visualize/visualize.less';
import 'ui/visualize/visualize_legend';
import $ from 'jquery';
import _ from 'lodash';
import RegistryVisTypesProvider from 'ui/registry/vis_types';
import uiModules from 'ui/modules';
import visualizeTemplate from 'ui/visualize/visualize.html';
import Chart from 'chart';
uiModules
.get('kibana/directive')
.directive('visualize', function (Notifier, SavedVis, indexPatterns, Private, config, $timeout) {


  let visTypes = Private(RegistryVisTypesProvider);

  let notify = new Notifier({
    location: 'Visualize'
  });

  function esRespConvertorFactory($el, $legend, chartType) {
    chartType = {
      pie: 'pie',
      line: 'line',
      area: 'line',
      histogram: 'bar'
    }[chartType];
    let myChart;
    function makeColor(num) {
      let hexStr = Math.round(num).toString(16);
      while (hexStr.length / 6 !== 1) {
        hexStr = '0' + hexStr;
      }
      return '#' + hexStr;
    }
    const isPieChart = (chartType === 'pie');
    function decodeBucketData(aggConfigs, aggregations) {
      const datasetMap = {};
      const xAxisLabels = [];
      // If there is no data
      if (!aggConfigs) { return datasetMap; }

      const maxAggDepth = aggConfigs.length - 1;
      let currDepth = 0;
      // meant to recursively crawl through es aggregations
      // to make sense of the data for a charting library
      function decodeBucket(aggConfig, aggResp) {
        aggResp.buckets.forEach((bucket) => {
          const isFirstAggConfig = currDepth === 0;

          if (isFirstAggConfig) { // Sets the labels for the X-Axis
            xAxisLabels.push(bucket.key);
          }
          if (currDepth < maxAggDepth) { // Crawl through the structure if we should
            const nextAggConfig = aggConfigs[++currDepth];
            decodeBucket(nextAggConfig, bucket[nextAggConfig.id]);
            currDepth--;
          } else {
            const isDateBucket = aggConfig.__type.dslName === 'date_histogram';
            const legendLabel = (isFirstAggConfig  && isDateBucket && !isPieChart) ? 'Count' : bucket.key;
            const dataset = datasetMap[legendLabel] || [];
            dataset.push(bucket.doc_count);
            datasetMap[legendLabel] = dataset;
          }
        });
      }
      const firstAggConfig = aggConfigs[0];
      decodeBucket(firstAggConfig, aggregations[firstAggConfig.id]);
      const legendLabels = [];
      const arrDatasets = _.map(datasetMap, (val, key) => {
        legendLabels.push(key);
        return {
          data: val,
          label: key,
          backgroundColor: []
        };
      });
      // Make some colors for all of the data points.
      // This need to be different, instead of looking at all the colors
      // you should look at RGB separate and limit the number from there
      // then multiply to get your result
      arrDatasets.forEach(set => {
        const allTheColors = Math.pow(16, 6);
        const colorOffset = allTheColors / 8;
        let numDataPoints = set.data.length;
        const maxColors = allTheColors - (colorOffset * 2);
        const difference = maxColors / numDataPoints;
        let currColor = colorOffset;
        while (numDataPoints-- > 0) {
          if (isPieChart) {
            set.backgroundColor.push(makeColor(currColor));
          }
          currColor += difference;
        }
        if (!isPieChart) {
          set.backgroundColor = set.backgroundColor[0];
        }
      });

      return {
        legend: legendLabels,
        labels: xAxisLabels,
        dataConfigs: arrDatasets
      };
    }
    return function convertEsRespAndAggConfig(esResp, aggConfigs) {
      const aggConfigMap = aggConfigs.byId;
      const decodedData = decodeBucketData(aggConfigs.bySchemaGroup.buckets, esResp.aggregations);
      if (myChart) { // Not a fan of this, i should be using update
        myChart.destroy();
      }
      myChart = new Chart($el, {
        type: chartType,
        data: {
          labels: decodedData.labels,
          datasets: decodedData.dataConfigs
        },
        fill: false,
        options: {
          legendCallback: function (chartObj) {
            const multipleBuckets = aggConfigs.bySchemaGroup.buckets.length > 1;
            const legendItems = multipleBuckets || isPieChart ? decodedData.legend : [aggConfigs.bySchemaGroup.metrics[0]._opts.type];
            const itemsHtmlArr = legendItems.map(item => { return '<li>' + item + '</li>'; });
            return '<ul>' + itemsHtmlArr.join('') + '</ul>';
          },
          legend: {
            display: false
          },
          tooltips: {
            callbacks: {
              title: function () { return 'hello world'; },
              label: function (item, data) {
                const dataset = data.datasets[item.datasetIndex];
                return dataset.label + ': ' + dataset.data[item.index];
              }
            }
          }
        }
      });

      $legend.html(myChart.generateLegend());
    };
  }

  return {
    restrict: 'E',
    scope : {
      showSpyPanel: '=?',
      vis: '=',
      uiState: '=?',
      searchSource: '=?',
      editableVis: '=?',
      esResp: '=?',
    },
    template: visualizeTemplate,
    link: function ($scope, $el, attr) {
      const esRespConvertor = esRespConvertorFactory($el.find('#canvas-chart'), $el.find('#chart-legend'), $scope.vis.type.name);
      let chart; // set in "vis" watcher
      let minVisChartHeight = 180;

      if (_.isUndefined($scope.showSpyPanel)) {
        $scope.showSpyPanel = true;
      }

      function getter(selector) {
        return function () {
          let $sel = $el.find(selector);
          if ($sel.size()) return $sel;
        };
      }

      let getVisEl = getter('.visualize-chart');
      let getVisContainer = getter('.vis-container');

      // Show no results message when isZeroHits is true and it requires search
      $scope.showNoResultsMessage = function () {
        let requiresSearch = _.get($scope, 'vis.type.requiresSearch');
        let isZeroHits = _.get($scope,'esResp.hits.total') === 0;
        let shouldShowMessage = !_.get($scope, 'vis.params.handleNoResults');

        return Boolean(requiresSearch && isZeroHits && shouldShowMessage);
      };

      $scope.spy = {};
      $scope.spy.mode = ($scope.uiState) ? $scope.uiState.get('spy.mode', {}) : {};

      let applyClassNames = function () {
        let $visEl = getVisContainer();
        let fullSpy = ($scope.spy.mode && ($scope.spy.mode.fill || $scope.fullScreenSpy));

        $visEl.toggleClass('spy-only', Boolean(fullSpy));

        $timeout(function () {
          if (shouldHaveFullSpy()) {
            $visEl.addClass('spy-only');
          };
        }, 0);
      };

      // we need to wait for some watchers to fire at least once
      // before we are "ready", this manages that
      let prereq = (function () {
        let fns = [];

        return function register(fn) {
          fns.push(fn);

          return function () {
            fn.apply(this, arguments);

            if (fns.length) {
              _.pull(fns, fn);
              if (!fns.length) {
                $scope.$root.$broadcast('ready:vis');
              }
            }
          };
        };
      }());

      let loadingDelay = config.get('visualization:loadingDelay');
      $scope.loadingStyle = {
        '-webkit-transition-delay': loadingDelay,
        'transition-delay': loadingDelay
      };

      function shouldHaveFullSpy() {
        let $visEl = getVisEl();
        if (!$visEl) return;

        return ($visEl.height() < minVisChartHeight)
          && _.get($scope.spy, 'mode.fill')
          && _.get($scope.spy, 'mode.name');
      }

      // spy watchers
      $scope.$watch('fullScreenSpy', applyClassNames);

      $scope.$watchCollection('spy.mode', function () {
        $scope.fullScreenSpy = shouldHaveFullSpy();
        applyClassNames();
      });

      $scope.$watch('vis', prereq(function (vis, oldVis) {
        let $visEl = getVisEl();
        if (!$visEl) return;

        if (!attr.editableVis) {
          $scope.editableVis = vis;
        }

        if (oldVis) $scope.renderbot = null;
        if (vis) $scope.renderbot = vis.type.createRenderbot(vis, $visEl, $scope.uiState);
      }));

      $scope.$watchCollection('vis.params', prereq(function () {
        if ($scope.renderbot) $scope.renderbot.updateParams();
      }));

      $scope.$watch('searchSource', prereq(function (searchSource) {
        if (!searchSource || attr.esResp) return;

        // TODO: we need to have some way to clean up result requests
        searchSource.onResults().then(function onResults(resp) {
          if ($scope.searchSource !== searchSource) return;

          $scope.esResp = resp;

          return searchSource.onResults().then(onResults);
        }).catch(notify.fatal);

        searchSource.onError(notify.error).catch(notify.fatal);
      }));

      $scope.$watch('esResp', prereq(function (resp, prevResp) {
        if (!resp) return;
        esRespConvertor(resp, $scope.vis.aggs);
        $scope.renderbot.render(resp);
      }));

      $scope.$watch('renderbot', function (newRenderbot, oldRenderbot) {
        if (oldRenderbot && newRenderbot !== oldRenderbot) {
          oldRenderbot.destroy();
        }
      });

      $scope.$on('$destroy', function () {
        if ($scope.renderbot) {
          $scope.renderbot.destroy();
        }
      });
    }
  };
});
