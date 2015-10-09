define(function (require) {

  var registerSuite = require('intern!object');
  var expect = require('intern/dojo/node!expect.js');
  // var Promise = require('bluebird');
  var Common = require('./Common');

  var defaultTimeout = 5000;
  var common;

  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function VisualizePage(remote) {
    this.remote = remote;
    common = new Common(this.remote);
  }

  VisualizePage.prototype = {
    constructor: VisualizePage,

    clickAreaChart: function clickAreaChart() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByPartialLinkText('Area chart')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickDataTable: function clickDataTable() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByPartialLinkText('Data table')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickLineChart: function clickLineChart() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByPartialLinkText('Line chart')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickMarkdownWidget: function clickMarkdownWidget() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByPartialLinkText('Markdown widget')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickMetric: function clickMetric() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByPartialLinkText('Metric')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickPieChart: function clickPieChart() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByPartialLinkText('Pie chart')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickTileMap: function clickTileMap() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByPartialLinkText('Tile map')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickVerticalBarChart: function clickVerticalBarChart() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByPartialLinkText('Vertical bar chart')
        .then(function (chart) {
          return chart
            .click();
        });
    },
    //////////////////////////

    getChartTypeCount: function getChartTypeCount() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findAllByCssSelector('a.wizard-vis-type.ng-scope')
        .then(function (chartTypes) {
          return chartTypes
            .length;
        });
    },

    getChartTypes: function getChartTypes() {
      var types = [];
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findAllByCssSelector('a.wizard-vis-type.ng-scope h4')
        .then(function (chartTypes) {
          function getChartType(chart) {
            return chart
              .getVisibleText();
          }
          var getChartTypesPromises = chartTypes.map(getChartType);
          return Promise.all(getChartTypesPromises);
        })
        .then(function (texts) {
          //common.log('returning types array here? ' + types);
          return texts;
        });
    },

    //
    clickTimepicker: function clickTimepicker() {
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByClassName('navbar-timepicker-time-desc')
        .then(function (picker) {
          return picker.click();
        });
    },

    clickAbsoluteButton: function clickAbsoluteButton() {
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('ul.nav.nav-pills.nav-stacked.kbn-timepicker-modes:contains("absolute")')
        .then(function (picker) {
          return picker.click();
        });
    },

    setFromTime: function setFromTime(timeString) {
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('input[ng-model="absolute.from"]')
        .then(function (picker) {
          // first delete the existing date
          return picker.type('\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + timeString);
        });
    },

    setToTime: function setToTime(timeString) {
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('input[ng-model="absolute.to"]')
        .then(function (picker) {
          return picker.type('\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + timeString);
        });
    },

    clickGoButton: function clickGoButton() {
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByClassName('kbn-timepicker-go')
        .then(function (button) {
          return button.click();
        });
    },


    setAbsoluteRange: function setAbsoluteRange(fromTime, toTime) {
      var self = this;
      common.log('--Clicking Absolute button');
      return self
        .clickAbsoluteButton()
        .then(function () {
          common.log('--Setting From Time : ' + fromTime);
          return self
            .setFromTime(fromTime)
            .then(function () {
              common.log('--Setting To Time : ' + toTime);
              return self
                .setToTime(toTime)
                .then(function () {
                  return self
                    .clickGoButton();
                });
            });

        });
    },

    collapseChart: function collapseChart() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('div.visualize-show-spy > div > i')
        .click();
    },

    collapseTimepicker: function collapseTimepicker() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('i.fa.fa-chevron-up')
        .click();
    },

    getMetric: function getMetric() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        // .findByCssSelector('div[ng-repeat="metric in metrics"')
        .findByCssSelector('div[ng-controller="KbnMetricVisController"]')
        .then(function (chart) {
          return chart
            .getVisibleText();
        });
    },

    clickMetricEditor: function clickMetricEditor() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('button[aria-label="Open Editor"]')
        .click();
    },

    clickNewSearch: function clickNewSearch() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('li[ng-click="stepTwoMode=\'new\'"]')
        .then(function clickIt(chart) {
          return chart
            .click();
        });
    },

    setValue: function setValue(newValue) {
      var self = this.remote;
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('button[ng-click="numberListCntr.add()"]')
        .then(function clickIt(button) {
          return button
            .click();
        })
        .then(function () {
          return self
            .setFindTimeout(defaultTimeout)
            .findByCssSelector('input[ng-model="numberListCntr.getList()[$index]"]')
            .then(function (textField) {
              return textField
                .type(newValue);
            });
        });
    },

    clickSavedSearch: function clickSavedSearch() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('li[ng-click="stepTwoMode=\'saved\'"]')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    selectSearch: function selectSearch(searchName) {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByLinkText(searchName)
        .then(function (savedSearchLink) {
          return savedSearchLink
            .click();
        });
    },


    getErrorMessage: function getErrorMessage() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('div.visualize-error.chart.error h4')
        .then(function (chart) {
          return chart
            .getVisibleText();
        });
    },

    // clickBucket(bucketType) 'X-Axis', 'Split Area', 'Split Chart'
    clickBucket: function clickBucket(bucketName) {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findAllByCssSelector('li.list-group-item.list-group-menu-item.ng-binding.ng-scope')
        .then(function (chartTypes) {
          common.log('found bucket types ' + chartTypes.length);

          function getChartType(chart) {
            return chart
              .getVisibleText()
              .then(function (chartString) {
                //common.log(chartString);
                if (chartString === bucketName) {
                  chart.click();
                }
              });
          }
          var getChartTypesPromises = chartTypes.map(getChartType);
          return Promise.all(getChartTypesPromises);
        });
    },

    selectAggregation: function selectAggregation(myString) {
      var self = this;
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('option[label="' + myString + '"]')
        .then(function (option) {
          return option
            .click();
        });
    },

    getField: function getField() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('.ng-valid-required[name="field"] option[selected="selected"]')
        .then(function (field) {
          return field
            .getVisibleText();
        });
    },

    selectField: function selectField(fieldValue) {
      return this.remote
        .setFindTimeout(defaultTimeout)
        // the css below should be more selective
        .findByCssSelector('option[label="' + fieldValue + '"]')
        .then(function (option) {
          return option
            .click();
        });
    },

    orderBy: function orderBy(fieldValue) {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('select.form-control.ng-pristine.ng-valid.ng-untouched.ng-valid-required[ng-model="agg.params.orderBy"] ' +
          'option.ng-binding.ng-scope:contains("' + fieldValue + '")'
        )
        .then(function (option) {
          return option
            .click();
        });
    },

    getInterval: function getInterval() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('select[ng-model="agg.params.interval"] option[selected="selected"]')
        .then(function (interval) {
          return interval
            .getVisibleText();
        });
    },

    setInterval: function setInterval(newValue) {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('select[ng-model="agg.params.interval"]')
        .then(function (interval) {
          return interval
            .type(newValue);
        });
    },

    setNumericInterval: function setNumericInterval(newValue) {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector(
          'input.form-control.ng-scope.ng-pristine.ng-untouched.ng-valid-number.ng-valid-min.ng-valid-whole.ng-invalid.ng-invalid-required'
        )
        .then(function (interval) {
          return interval
            .type(newValue);
        });
    },

    clickGo: function clickGo() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('.btn-success')
        .then(function (button) {
          return button
            .click();
        });
    },


    clickNewVisualization: function clickNewVisualization() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('button.ng-scope[aria-label="New Visualization"]')
        .then(function (newButton) {
          common.log(' ------------------------------------------ Found "New Visualization" button, clicking it');
          return newButton
            .click();
        });
    },


    saveVisualization: function saveVisualization(vizName) {
      var self = this;
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('button.ng-scope[aria-label="Save Visualization"]')
        .then(function (saveButton) {
          return saveButton
            .click();
        })
        .then(function () {
          common.log('saveButton button clicked');
          return self.remote
            .setFindTimeout(defaultTimeout)
            .findByName('visTitle')
            .then(function (vizField) {
              return vizField
                .type(vizName);
            })
            //   // click save button
            .then(function () {
              return self.remote
                .setFindTimeout(defaultTimeout)
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
                .setFindTimeout(defaultTimeout)
                .findByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
                .then(function (messageBar) {
                  return messageBar
                    .getVisibleText();
                  // .then(function (theText) {
                  //   common.log('Message text = ' + theText);
                  // });
                });
            });
        });
    },

    // saved visualizations are paginated 5 to a page!
    loadSavedVisualization: function loadSavedVisualization(vizName) {
      var self = this;
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('button.ng-scope[aria-label="Load Saved Visualization"]')
        .then(function (loadButton) {
          return loadButton
            .click();
        })
        .then(function () {
          common.log('Load Saved Vis button clicked');
          return self.remote
            .setFindTimeout(defaultTimeout)
            .findByLinkText(vizName)
            .then(function (viz) {
              return viz
                .click();
            })
            .catch(function () {
              common.log('didn\'t find vis name on first page');
              return;
            });
        });
    },

    getXAxisLabels: function getXAxisLabels() { // doesn't split on Firefox
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('div.x-axis-div')
        .then(function (xAxis) {
          return xAxis
            .getVisibleText()
            .then(function (xAxisText) {
              return xAxisText;
            });
        });
    },


    // getXAxisLabels: function getXAxisLabels() {
    //   //var types = [];
    //   return this.remote
    //     .setFindTimeout(defaultTimeout * 5)
    //     .findAllByCssSelector('.x > g')
    //     .then(function (chartTypes) {
    //       function getChartType(chart) {
    //         return chart
    //           .getVisibleText()
    //           .then(function (theText) {
    //             common.log('theText = ' + theText);
    //             return theText;
    //           });
    //       }
    //       var getChartTypesPromises = chartTypes.map(getChartType);
    //       return Promise.all(getChartTypesPromises);
    //     })
    //     .then(function (texts) {
    //       common.log('returning types array here? ' + texts);
    //       return texts;
    //     });
    // },


    getYAxisLabels: function getYAxisLabels() {
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('div.y-axis-div')
        .then(function (yAxis) {
          return yAxis
            .getVisibleText()
            .then(function (yAxisText) {
              //common.log('yAxisText here = ' + yAxisText);
              return yAxisText;
            });
        });
    },

    /*
     ** This method gets the chart data and scales it based on chart height and label.
     ** Returns an array of height values
     */
    getAreaChartData: function getAreaChartData() {

      var self = this.remote;
      var chartData = [];
      var tempArray = [];
      var chartSections = 0;
      var chartMap = {};
      var height = 0;
      var yAxisLabel = 0;
      var yAxisHeight = 0;

      // 1). get the maximim chart Y-Axis marker value
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('div.y-axis-div-wrapper > div > svg > g > g:last-of-type')
        .then(function setYAxisLabel(y) {
          return y
            .getVisibleText()
            .then(function (yLabel) {
              yAxisLabel = yLabel.replace(',', '');
              common.log('yAxisLabel = ' + yAxisLabel);
              return yLabel;
            });
        })
        // 2). find and save the y-axis pixel size (the chart height)
        .then(function () {
          return self
            .setFindTimeout(defaultTimeout)
            .findByCssSelector('rect.background') // different here
            .then(function (chartAreaObj) {
              return chartAreaObj
                .getAttribute('height')
                .then(function (chartH) {
                  yAxisHeight = chartH;
                  common.log('height --------- ' + yAxisHeight);
                });
            });
        })
        .then(function () {
          return self.setFindTimeout(defaultTimeout * 2)
            .findAllByCssSelector('path')
            .then(function (chartTypes) {

              function getChartType(chart) {
                return chart
                  .getAttribute('data-label')
                  .then(function (chartString) {
                    //common.log('data-label  = ' + chartString);
                    if (chartString === 'Count') {
                      return chart.getAttribute('d')
                        .then(function (data) {
                          common.log(data);
                          tempArray = data.split('L');
                          chartSections = tempArray.length / 2;
                          common.log('chartSections = ' + chartSections + ' height = ' + yAxisHeight + ' yAxisLabel = ' + yAxisLabel);

                          chartData[0] = Math.round((yAxisHeight - tempArray[0].split(',')[1]) / yAxisHeight * yAxisLabel);
                          common.log('chartData[0] =' + chartData[0]);
                          for (var i = 1; i < chartSections; i++) {
                            chartData[i] = Math.round((yAxisHeight - tempArray[i].split(',')[1]) / yAxisHeight * yAxisLabel);
                            common.log('chartData[i] =' + chartData[i]);
                          }
                          return chartData;
                        });
                    }
                  });
              }
              var getChartTypesPromises = chartTypes.map(getChartType);
              return Promise.all(getChartTypesPromises);
            });
        })
        .then(function (chartData) {
          return chartData[1]; // MAGIC NUMBER - we find multiple 'path's and only one of them is the right one.
        });
    },

    // The current test shows dots, not a line.  This function gets the dots and normalizes their height.
    getLineChartData: function getLineChartData() {
      var self = this.remote;
      var yAxisLabel = 0;
      var yAxisHeight;

      // 1). get the maximim chart Y-Axis marker value
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('div.y-axis-div-wrapper > div > svg > g > g:last-of-type')
        .then(function setYAxisLabel(y) {
          return y
            .getVisibleText()
            .then(function (yLabel) {
              yAxisLabel = yLabel.replace(',', '');
              common.log('yAxisLabel = ' + yAxisLabel);
              return yLabel;
            });
        })
        // 2). find and save the y-axis pixel size (the chart height)
        .then(function getRect() {
          return self
            .setFindTimeout(defaultTimeout)
            .findByCssSelector('clipPath rect')
            .then(function getRectHeight(chartAreaObj) {
              return chartAreaObj
                .getAttribute('height')
                .then(function (theHeight) {
                  yAxisHeight = theHeight - 5; // MAGIC NUMBER - clipPath extends a bit above the top of the y-axis and below x-axis
                  common.log('theHeight = ' + theHeight);
                  return theHeight;
                });
            });
        })
        // 3). get the chart-wrapper elements
        .then(function getChartWrapper() {
          return self
            .setFindTimeout(defaultTimeout * 2)
            .findAllByCssSelector('.chart-wrapper')
            .then(function (chartTypes) {

              // 5). for each chart element, find the green circle, then the cy position
              function getChartType(chart) {
                return chart
                  .findByCssSelector('circle[fill="#57c17b"]')
                  .then(function (circleObject) {
                    // common.log('circleObject = ' + circleObject + ' yAxisHeight= ' + yAxisHeight + ' yAxisLabel= ' + yAxisLabel);
                    return circleObject
                      .getAttribute('cy')
                      .then(function (cy) {
                        // common.log(' yAxisHeight=' + yAxisHeight + ' yAxisLabel=' + yAxisLabel + '  cy=' + cy +
                        //   ' ((yAxisHeight - cy)/yAxisHeight * yAxisLabel)=' + ((yAxisHeight - cy) / yAxisHeight * yAxisLabel));
                        return ((yAxisHeight - cy) / yAxisHeight * yAxisLabel);
                      });
                  });
              }

              // 4). pass the chartTypes to the getChartType function
              var getChartTypesPromises = chartTypes.map(getChartType);
              return Promise.all(getChartTypesPromises);
            });
        })

      .then(function (yCoords) {
        return yCoords;
      });
    },


    // this is ALMOST identical to DiscoverPAge.getBarChartData
    getBarChartData: function getBarChartData() {
      var self = this.remote;
      var yAxisLabel = 0;
      var yAxisHeight;

      // 1). get the maximim chart Y-Axis marker value
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('div.y-axis-div-wrapper > div > svg > g > g:last-of-type')
        .then(function setYAxisLabel(y) {
          return y
            .getVisibleText()
            .then(function (yLabel) {
              yAxisLabel = yLabel.replace(',', '');
              common.log('yAxisLabel = ' + yAxisLabel);
              return yLabel;
            });
        })
        // 2). find and save the y-axis pixel size (the chart height)
        .then(function getRect() {
          return self
            .setFindTimeout(defaultTimeout)
            .findByCssSelector('rect.background')
            .then(function getRectHeight(chartAreaObj) {
              return chartAreaObj
                .getAttribute('height')
                .then(function (theHeight) {
                  yAxisHeight = theHeight; // - 5; // MAGIC NUMBER - clipPath extends a bit above the top of the y-axis and below x-axis
                  common.log('theHeight = ' + theHeight);
                  return theHeight;
                });
            });
        })
        // 3). get the chart-wrapper elements
        .then(function () {
          return self
            .setFindTimeout(defaultTimeout * 2)
            // #kibana-body > div.content > div > div > div > div.vis-editor-canvas > visualize > div.visualize-chart > div > div.vis-col-wrapper > div.chart-wrapper > div > svg > g > g.series.\30 > rect:nth-child(1)
            .findAllByCssSelector('svg > g > g.series.\\30 > rect') // rect
            .then(function (chartTypes) {
              function getChartType(chart) {
                return chart
                  .getAttribute('fill')
                  .then(function (fillColor) {
                    // we're only getting the Green Bars
                    if (fillColor === '#57c17b') {
                      return chart
                        .getAttribute('height')
                        .then(function (barHeight) {
                          return Math.round(barHeight / yAxisHeight * yAxisLabel);
                        });
                    }
                  });
              }
              var getChartTypesPromises = chartTypes.map(getChartType);
              return Promise.all(getChartTypesPromises);
            })
            .then(function (bars) {
              return bars;
            });
        });

    },



    getChartAreaWidth: function getChartAreaWidth() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('clipPath rect')
        .then(function (chartAreaObj) {
          return chartAreaObj
            .getAttribute('width');
        });
    },
    getChartAreaHeight: function getChartAreaHeight() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('clipPath rect')
        .then(function (chartAreaObj) {
          return chartAreaObj
            .getAttribute('height');
        });
    },

    getSpinnerDone: function getSpinnerDone() {
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('span.spinner.ng-hide');
    },


    getDataTableData: function getDataTableData() {
      // html body#kibana-body div.content div.application.ng-scope.tab-visualize div.vis-editor.vis-type-table div.vis-editor-content div.vis-editor-canvas visualize.ng-isolate-scope.only-visualization div.visualize-chart div.table-vis.ng-scope div.table-vis-container.ng-scope kbn-agg-table-group.ng-isolate-scope table.table.agg-table-group.ng-scope tbody.ng-scope tr td kbn-agg-table.ng-scope.ng-isolate-scope paginated-table.ng-scope.ng-isolate-scope paginate.agg-table.ng-scope div.agg-table-paginated table.table.table-condensed tbody
      // #kibana-body > div.content > div > div > div > div.vis-editor-canvas > visualize > visualize-spy > div.visualize-spy-container > div > kbn-agg-table > paginated-table > paginate > div.agg-table-paginated > table > tbody > tr:nth-child(1) > td.cell-hover.ng-scope
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('table.table.table-condensed tbody')
        .then(function (data) {
          return data.getVisibleText();
        });
    },

    clickColumns: function clickColumns() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        // html body#kibana-body div.content div.application.ng-scope.tab-visualize div.vis-editor.vis-type-line div.vis-editor-content div.collapsible-sidebar vis-editor-sidebar.vis-editor-sidebar.ng-scope div.sidebar-container form.sidebar-list.ng-dirty.ng-valid.ng-valid-required div.vis-editor-config vis-editor-agg-group.ng-scope div.sidebar-item div.vis-editor-agg-group.buckets div.vis-editor-agg-wrapper.ng-scope ng-form.vis-editor-agg.ng-dirty.ng-valid.ng-valid-required vis-editor-agg-params.vis-editor-agg-editor.ng-scope div.schemaEditors.ng-scope div.form-group div.btn-group button.btn.btn-xs.btn-default.ng-valid.ng-dirty.active.ng-touched
        // #kibana-body > div.content > div > div > div > div.collapsible-sidebar > vis-editor-sidebar > div > form > div:nth-child(3) > vis-editor-agg-group:nth-child(2) > div > div.vis-editor-agg-group.buckets > div > ng-form > vis-editor-agg-params > div.schemaEditors.ng-scope > div > div > button:nth-child(2)
        .findByCssSelector('div.schemaEditors.ng-scope > div > div > button:nth-child(2)')
        .then(function clickIt(chart) {
          return chart
            .click();
        });
    },

    waitForToastMessageGone: function waitForToastMessageGone() {
      var self = this;
      return common.tryForTime(defaultTimeout * 5, function tryingForTime() {
        return self.remote
          .setFindTimeout(100)
          .findAllByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
          .then(function toastMessage(messages) {
            //common.log('here');
            if (messages.length > 0) {
              throw new Error('waiting for messages = 0  ');
            } else {
              //common.log('now messages = 0 "' + messages + '"');
              return messages;
            }
          });
      });


    }

  };

  return VisualizePage;
});
