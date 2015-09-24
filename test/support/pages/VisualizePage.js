define(function (require) {

  var registerSuite = require('intern!object');
  //var ScenarioManager = require('intern/dojo/node!../fixtures/scenarioManager');

  var defaultTimeout = 5000;

  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function VisualizePage(remote) {
    this.remote = remote;
  }

  VisualizePage.prototype = {
    constructor: VisualizePage,

    clickAreaChart: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByPartialLinkText('Area chart')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickDataTable: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByPartialLinkText('Data table')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickLineChart: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByPartialLinkText('Line chart')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickMarkdownWidget: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByPartialLinkText('Markdown widget')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickMetric: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByPartialLinkText('Metric')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickPieChart: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByPartialLinkText('Pie chart')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickTileMap: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByPartialLinkText('Tile map')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickVerticalBarChart: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByPartialLinkText('Vertical bar chart')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    getChartTypeCount: function () {
      return this.remote
        .setFindTimeout(5000)
        .findAllByCssSelector('a.wizard-vis-type.ng-scope')
        .then(function (chartTypes) {
          return chartTypes
            .length;
        });
    },

    getChartTypes: function () {
      var types = [];
      return this.remote
        .setFindTimeout(5000)
        .findAllByCssSelector('a.wizard-vis-type.ng-scope h4')
        .then(function (chartTypes) {
          function getChartType(chart) {
            return chart
              .getVisibleText()
              .then(function (chartString) {
                types.push(chartString);
                //console.log('types here = ' + types);
              });
          }
          var getChartTypesPromises = chartTypes.map(getChartType);
          return Promise.all(getChartTypesPromises);
        })
        .then(function () {
          //console.log('returning types array here? ' + types);
          return types;
        });
    },

    clickTimepicker: function () {
      return this.remote
        .setFindTimeout(15000)
        .findByClassName('navbar-timepicker-time-desc')
        .then(function (picker) {
          return picker.click();
        });
    },

    clickAbsoluteButton: function () {
      return this.remote
        .setFindTimeout(10000)
        .findByCssSelector('ul.nav.nav-pills.nav-stacked.kbn-timepicker-modes:contains("absolute")')
        .then(function (picker) {
          return picker.click();
        });
    },

    setFromTime: function (timeString) {
      return this.remote
        .setFindTimeout(10000)
        .findByCssSelector('input[ng-model="absolute.from"]')
        .then(function (picker) {
          // first delete the existing date
          return picker.type('\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + timeString);
        });
    },

    setToTime: function (timeString) {
      return this.remote
        .setFindTimeout(10000)
        .findByCssSelector('input[ng-model="absolute.to"]')
        .then(function (picker) {
          return picker.type('\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + timeString);
        });
    },

    clickGoButton: function () {
      return this.remote
        .setFindTimeout(10000)
        .findByClassName('kbn-timepicker-go')
        .then(function (button) {
          return button.click();
        });
    },


    setAbsoluteRange: function (fromTime, toTime) {
      var self = this;
      console.log('--Clicking Absolute button');
      return self
        .clickAbsoluteButton()
        .then(function () {
          console.log('--Setting From Time : ' + fromTime);
          return self
            .setFromTime(fromTime)
            .then(function () {
              console.log('--Setting To Time : ' + toTime);
              return self
                .setToTime(toTime)
                .then(function () {
                  return self
                    .clickGoButton();
                });
            });

        });
    },

    collapseTimepicker: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('i.fa.fa-chevron-up')
        .click();
    },


    clickNewSearch: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('li[ng-click="stepTwoMode=\'new\'"]')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickSavedSearch: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('li[ng-click="stepTwoMode=\'saved\'"]')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    getErrorMessage: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('div.visualize-error.chart.error h4')
        .then(function (chart) {
          return chart
            .getVisibleText();
        });
    },

    // clickBucket(bucketType) 'X-Axis', 'Split Area', 'Split Chart'
    clickBucket: function (bucketName) {
      return this.remote
        .setFindTimeout(5000)
        .findAllByCssSelector('li.list-group-item.list-group-menu-item.ng-binding.ng-scope')
        .then(function (chartTypes) {
          console.log('found bucket types ' + chartTypes.length);

          function getChartType(chart) {
            return chart
              .getVisibleText()
              .then(function (chartString) {
                console.log(chartString);
                if (chartString === bucketName) {
                  chart.click();
                }
              });
          }
          var getChartTypesPromises = chartTypes.map(getChartType);
          return Promise.all(getChartTypesPromises);
        });
    },

    selectAggregation: function (myString) {
      var self = this;
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('option[label="' + myString + '"]')
        .then(function (option) {
          return option
            .click();
        });
    },

    getField: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('.ng-valid-required[name="field"] option[selected="selected"]') //
        .then(function (field) {
          return field
            .getVisibleText();
        });
    },

    getInterval: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('select[ng-model="agg.params.interval"] option[selected="selected"]')
        .then(function (interval) {
          return interval
            .getVisibleText();
        });
    },

    clickGo: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('.btn-success')
        .then(function (button) {
          return button
            .click();
        });
    },


    saveVisualization: function (vizName) {
      var self = this;
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('button.ng-scope[aria-label="Save Visualization"]')
        .then(function (saveButton) {
          return saveButton
            .click();
        })
        .then(function () {
          console.log('saveButton button clicked');
          return self.remote
            .setFindTimeout(5000)
            .findByName('visTitle')
            .then(function (vizField) {
              return vizField
                .type(vizName);
            })
            //   // click save button
            .then(function () {
              return self.remote
                .setFindTimeout(5000)
                .findByCssSelector('.btn-primary')
                .then(function (saveButton) {
                  return saveButton
                    .click();
                });
            })
            // verify that green message at the top of the page.
            // it's only there for about 5 seconds
            .then(function () {
              return self.remote
                .setFindTimeout(5000)
                .findByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
                .then(function (messageBar) {
                  return messageBar
                    .getVisibleText();
                  // .then(function (theText) {
                  //   console.log('Message text = ' + theText);
                  // });
                });
            });
        });
    },

    loadSavedVisualization: function (vizName) {
      var self = this;
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('button.ng-scope[aria-label="Load Saved Visualization"]')
        .then(function (loadButton) {
          return loadButton
            .click();
        })
        .then(function () {
          console.log(Date.now() + ' Load Saved Vis button clicked');
          return self.remote
            .setFindTimeout(5000)
            .findByLinkText(vizName)
            .then(function (viz) {
              return viz
                .click();
            });
        });
    },

    getXAxisLabels: function () {
      return this.remote
        .setFindTimeout(15000)
        .findByCssSelector('div.x-axis-div')
        .then(function (xAxis) {
          return xAxis
            .getVisibleText()
            .then(function (xAxisText) {
              //console.log('xAxisText here = ' + xAxisText);
              return xAxisText;
            });
        });
    },

    getYAxisLabels: function () {
      return this.remote
        .setFindTimeout(15000)
        .findByCssSelector('div.y-axis-div')
        .then(function (yAxis) {
          return yAxis
            .getVisibleText()
            .then(function (yAxisText) {
              //console.log('yAxisText here = ' + yAxisText);
              return yAxisText;
            });
        });
    },

    getAreaChartData: function () {
      var chartData = [];
      return this.remote
        .setFindTimeout(15000)
        .findAllByCssSelector('path')
        .then(function (chartTypes) {
          function getChartType(chart) {
            return chart
              .getAttribute('data-label')
              .then(function (chartString) {
                console.log('data-label  = ' + chartString);
                if (chartString === 'Count') {
                  return chart.getAttribute('d')
                    .then(function (data) {
                      // console.log('Chart data = ' + data);
                      chartData = data.split('L');
                    });
                }
              });
          }
          var getChartTypesPromises = chartTypes.map(getChartType);
          return Promise.all(getChartTypesPromises);
        })
        .then(function () {
          return chartData;
        });
    },

    // experiemental method to try to get the data path with a single selector (not working)
    getAreaChartData2: function () {
      var chartData = [];
      return this.remote
        .setFindTimeout(15000)
        // html body#kibana-body div.content div.application.ng-scope.tab-visualize div.vis-editor.vis-type-area div.vis-editor-content div.vis-editor-canvas
        // visualize.ng-isolate-scope.only-visualization div.visualize-chart div.vis-wrapper div.vis-col-wrapper div.chart-wrapper div.chart svg g g.pathgroup.0 path
        // .findAllByCssSelector('g.pathgroup.0')  // InvalidSelector
        // .findByCssSelector('g.pathgroup.0') // InvalidSelector
        .findAllByCssSelector('path')
        .then(function (chart) {
          console.log('chart length = ' + chart.length);
          return chart.getAttribute('d');
        });
    },



    getChartAreaWidth: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('clipPath rect')
        .then(function (chartAreaObj) {
          return chartAreaObj
            .getAttribute('width');
        });
    },
    getChartAreaHeight: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('clipPath rect')
        .then(function (chartAreaObj) {
          return chartAreaObj
            .getAttribute('height');
        });
    },

    getSpinnerDone: function () {
      console.log('--getSpinner done method');
      return this.remote
        .setFindTimeout(15000)
        .findByCssSelector('span.spinner.ng-hide');
    }

  };

  return VisualizePage;
});
