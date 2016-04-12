define(function (require) {

  var config = require('intern').config;
  var registerSuite = require('intern!object');
  var Common = require('./common');

  var defaultTimeout = config.timeouts.default;
  var common;

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
      .click();
    },

    clickDataTable: function clickDataTable() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByPartialLinkText('Data table')
      .click();
    },

    clickLineChart: function clickLineChart() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByPartialLinkText('Line chart')
        .click();
    },

    clickMarkdownWidget: function clickMarkdownWidget() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByPartialLinkText('Markdown widget')
      .click();
    },

    clickMetric: function clickMetric() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByPartialLinkText('Metric')
      .click();
    },

    clickPieChart: function clickPieChart() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByPartialLinkText('Pie chart')
      .click();
    },

    clickTileMap: function clickTileMap() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByPartialLinkText('Tile map')
      .click();
    },

    clickVerticalBarChart: function clickVerticalBarChart() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByPartialLinkText('Vertical bar chart')
      .click();
    },

    getChartTypeCount: function getChartTypeCount() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findAllByCssSelector('a.wizard-vis-type.ng-scope')
      .length;
    },

    getChartTypes: function getChartTypes() {
      var types = [];
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findAllByCssSelector('.wizard-type-heading h4')
      .then(function (chartTypes) {
        function getChartType(chart) {
          return chart.getVisibleText();
        }
        var getChartTypesPromises = chartTypes.map(getChartType);
        return Promise.all(getChartTypesPromises);
      })
      .then(function (texts) {
        return texts;
      });
    },

    clickAbsoluteButton: function clickAbsoluteButton() {
      return this.remote
      .setFindTimeout(defaultTimeout * 2)
      .findByCssSelector('ul.nav.nav-pills.nav-stacked.kbn-timepicker-modes:contains("absolute")')
      .click();
    },

    setFromTime: function setFromTime(timeString) {
      return this.remote
      .setFindTimeout(defaultTimeout * 2)
      .findByCssSelector('input[ng-model="absolute.from"]')
      .clearValue()
      .type(timeString);
    },

    setToTime: function setToTime(timeString) {
      return this.remote
      .setFindTimeout(defaultTimeout * 2)
      .findByCssSelector('input[ng-model="absolute.to"]')
      .clearValue()
      .type(timeString);
    },

    clickGoButton: function clickGoButton() {
      return this.remote
      .setFindTimeout(defaultTimeout * 2)
      .findByClassName('kbn-timepicker-go')
      .click();
    },

    collapseChart: function collapseChart() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('div.visualize-show-spy > div > i')
      .click();
    },

    getMetric: function getMetric() {
      return this.remote
      .setFindTimeout(2000)
      .findByCssSelector('div[ng-controller="KbnMetricVisController"]')
      .getVisibleText();
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
      .findByCssSelector('.list-group-item a')
      .click();
    },

    setValue: function setValue(newValue) {
      var self = this.remote;
      return this.remote
      .setFindTimeout(defaultTimeout * 2)
      .findByCssSelector('button[ng-click="numberListCntr.add()"]')
      .click()
      .then(function () {
        return self
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('input[ng-model="numberListCntr.getList()[$index]"]')
        .clearValue();
      })
      .then(function () {
        return self
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('input[ng-model="numberListCntr.getList()[$index]"]')
        .type(newValue);
      });
    },

    clickSavedSearch: function clickSavedSearch() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('li[ng-click="stepTwoMode=\'saved\'"]')
      .click();
    },

    selectSearch: function selectSearch(searchName) {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByLinkText(searchName)
      .click();
    },


    getErrorMessage: function getErrorMessage() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('.item>h4')
      .getVisibleText();
    },

    // clickBucket(bucketType) 'X-Axis', 'Split Area', 'Split Chart'
    clickBucket: function clickBucket(bucketName) {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findAllByCssSelector('li.list-group-item.list-group-menu-item.ng-binding.ng-scope')
      .then(function (chartTypes) {
        common.debug('found bucket types ' + chartTypes.length);

        function getChartType(chart) {
          return chart
          .getVisibleText()
          .then(function (chartString) {
            //common.debug(chartString);
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
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('option[label="' + myString + '"]')
      .click();
    },

    getField: function getField() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('.ng-valid-required[name="field"] option[selected="selected"]')
      .getVisibleText();
    },

    selectField: function selectField(fieldValue) {
      return this.remote
      .setFindTimeout(defaultTimeout)
      // the css below should be more selective
      .findByCssSelector('option[label="' + fieldValue + '"]')
      .click();
    },

    orderBy: function orderBy(fieldValue) {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('select.form-control.ng-pristine.ng-valid.ng-untouched.ng-valid-required[ng-model="agg.params.orderBy"] ' +
        'option.ng-binding.ng-scope:contains("' + fieldValue + '")'
      )
      .click();
    },

    getInterval: function getInterval() {
      var self = this;
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('select[ng-model="agg.params.interval"]')
      .getProperty('selectedIndex')
      .then(function (selectedIndex) {
        return self.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('select[ng-model="agg.params.interval"] option:nth-child(' + (selectedIndex + 1) + ')')
        .getProperty('label');
      });
    },

    setInterval: function setInterval(newValue) {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('select[ng-model="agg.params.interval"]')
      .type(newValue);
    },

    setNumericInterval: function setNumericInterval(newValue) {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('input[name="interval"]')
      .type(newValue);
    },

    clickGo: function clickGo() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('.btn-success')
      .click();
    },


    clickNewVisualization: function clickNewVisualization() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('button[aria-label="New Visualization"]')
      .click();
    },


    saveVisualization: function saveVisualization(vizName) {
      var self = this;
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('button[aria-label="Save Visualization"]')
      .click()
      .then(function () {
        return common.sleep(1000);
      })
      .then(function () {
        common.debug('saveButton button clicked');
        return self.remote
        .setFindTimeout(defaultTimeout)
        .findByName('visTitle')
        .type(vizName);
      })
      //   // click save button
      .then(function () {
        common.debug('click submit button');
        return self.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('.config button[type="submit"]')
        .click();
      })
      // verify that green message at the top of the page.
      // it's only there for about 5 seconds
      .then(function () {
        return self.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
        .getVisibleText();
      });
    },

    clickLoadSavedVisButton: function clickLoadSavedVisButton() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findDisplayedByCssSelector('button[aria-label="Load Saved Visualization"]')
        .click();
    },

    filterVisByName: function filterVisByName(vizName) {
      return this.remote
        .findByCssSelector('input[name="filter"]')
        .click()
        // can't uses dashes in saved visualizations when filtering
        // or extended character sets
        // https://github.com/elastic/kibana/issues/6300
        .type(vizName.replace('-',' '));
    },

    clickVisualizationByLinkText: function clickVisualizationByLinkText(vizName) {
      var self = this;
      common.debug('clickVisualizationByLinkText(' + vizName + ')');

      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByLinkText(vizName)
        .click();
    },

    // this starts by clicking the Load Saved Viz button, not from the
    // bottom half of the "Create a new visualization      Step 1" page
    loadSavedVisualization: function loadSavedVisualization(vizName) {
      var self = this;
      return this.clickLoadSavedVisButton()
      .then(function filterVisualization() {
        return self.openSavedVisualization(vizName);
      });
    },

    // this is for starting on the
    // bottom half of the "Create a new visualization      Step 1" page
    openSavedVisualization: function openSavedVisualization(vizName) {
      var self = this;
      return self.filterVisByName(vizName)
      .then(function () {
        return common.sleep(1000);
      })
      .then(function clickDashboardByLinkedText() {
        return self.clickVisualizationByLinkText(vizName);
      });
    },

    getXAxisLabels: function getXAxisLabels() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findAllByCssSelector('.x > g')
      .then(function (chartTypes) {
        function getChartType(chart) {
          return chart
          .getVisibleText();
        }
        var getChartTypesPromises = chartTypes.map(getChartType);
        return Promise.all(getChartTypesPromises);
      })
      .then(function (texts) {
        // common.debug('returning types array ' + texts + ' array length =' + texts.length);
        return texts;
      });
    },


    getYAxisLabels: function getYAxisLabels() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findAllByCssSelector('.y > g')
      .then(function (chartTypes) {
        function getChartType(chart) {
          return chart
          .getVisibleText();
        }
        var getChartTypesPromises = chartTypes.map(getChartType);
        return Promise.all(getChartTypesPromises);
      })
      .then(function (texts) {
        // common.debug('returning types array ' + texts + ' array length =' + texts.length);
        return texts;
      });
    },


    /*
     ** This method gets the chart data and scales it based on chart height and label.
     ** Returns an array of height values
     */
    getAreaChartData: function getAreaChartData(aggregateName) {

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
      .getVisibleText()
      .then(function (yLabel) {
        // since we're going to use the y-axis 'last' (top) label as a number to
        // scale the chart pixel data, we need to clean out commas and % marks.
        yAxisLabel = yLabel.replace(/(%|,)/g, '');
        common.debug('yAxisLabel = ' + yAxisLabel);
        return yLabel;
      })
      // 2). find and save the y-axis pixel size (the chart height)
      .then(function () {
        return self
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('rect.background') // different here
        .getAttribute('height');
      })
      .then(function (chartH) {
        yAxisHeight = chartH;
        common.debug('height --------- ' + yAxisHeight);
      })
      .then(function () {
        return self.setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('path[data-label="' + aggregateName + '"]')
        .getAttribute('d');
      })
      .then(function (data) {
        common.debug(data);
        // This area chart data starts with a 'M'ove to a x,y location, followed
        // by a bunch of 'L'ines from that point to the next.  Those points are
        // the values we're going to use to calculate the data values we're testing.
        // So git rid of the one 'M' and split the rest on the 'L's.
        tempArray = data.replace('M','').split('L');
        chartSections = tempArray.length / 2;
        common.debug('chartSections = ' + chartSections + ' height = ' + yAxisHeight + ' yAxisLabel = ' + yAxisLabel);
        for (var i = 0; i < chartSections; i++) {
          chartData[i] = Math.round((yAxisHeight - tempArray[i].split(',')[1]) / yAxisHeight * yAxisLabel);
          common.debug('chartData[i] =' + chartData[i]);
        }
        return chartData;
      });
    },


    // The current test shows dots, not a line.  This function gets the dots and normalizes their height.
    getLineChartData: function getLineChartData(cssPart) {
      var self = this.remote;
      var yAxisLabel = 0;
      var yAxisHeight;

      // 1). get the maximim chart Y-Axis marker value
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('div.y-axis-div-wrapper > div > svg > g > g:last-of-type')
        .getVisibleText()
        .then(function (yLabel) {
          yAxisLabel = yLabel.replace(',', '');
          common.debug('yAxisLabel = ' + yAxisLabel);
          return yLabel;
        })
        // 2). find and save the y-axis pixel size (the chart height)
        .then(function getRect() {
          return self
          .setFindTimeout(defaultTimeout)
          .findByCssSelector('clipPath rect')
          .getAttribute('height')
          .then(function (theHeight) {
            yAxisHeight = theHeight - 5; // MAGIC NUMBER - clipPath extends a bit above the top of the y-axis and below x-axis
            common.debug('theHeight = ' + theHeight);
            return theHeight;
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
              .findByCssSelector('circle[fill="#6eadc1"]')
              .then(function (circleObject) {
                // common.debug('circleObject = ' + circleObject + ' yAxisHeight= ' + yAxisHeight + ' yAxisLabel= ' + yAxisLabel);
                return circleObject
                .getAttribute('cy');
              })
              .then(function (cy) {
                // common.debug(' yAxisHeight=' + yAxisHeight + ' yAxisLabel=' + yAxisLabel + '  cy=' + cy +
                //   ' ((yAxisHeight - cy)/yAxisHeight * yAxisLabel)=' + ((yAxisHeight - cy) / yAxisHeight * yAxisLabel));
                return Math.round((yAxisHeight - cy) / yAxisHeight * yAxisLabel);
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


    // this is ALMOST identical to DiscoverPage.getBarChartData
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
          common.debug('yAxisLabel = ' + yAxisLabel);
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
            common.debug('theHeight = ' + theHeight);
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
              if (fillColor === '#6eadc1') {
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

    getPieChartData: function getPieChartData() {
      var self = this.remote;

      // 1). get the maximim chart Y-Axis marker value
      return this.remote
      .setFindTimeout(defaultTimeout * 2)
      // path.slice:nth-child(11)
      .findAllByCssSelector('path.slice')
      .then(function (chartTypes) {
        function getChartType(chart) {
          return chart
          .getAttribute('d')
          .then(function (slice) {
            return slice;
          });
        }
        var getChartTypesPromises = chartTypes.map(getChartType);
        return Promise.all(getChartTypesPromises);
      })
      .then(function (slices) {
        common.debug('slices=' + slices);
        return slices;
      });
    },

    getChartAreaWidth: function getChartAreaWidth() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('clipPath rect')
      .getAttribute('width');
    },
    getChartAreaHeight: function getChartAreaHeight() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('clipPath rect')
      .getAttribute('height');
    },

    getDataTableData: function getDataTableData() {
      return this.remote
      .setFindTimeout(defaultTimeout * 2)
      .findByCssSelector('table.table.table-condensed tbody')
      .getVisibleText();
    },

    getMarkdownData: function getMarkdownData() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('visualize.ng-isolate-scope')
      .getVisibleText();
    },

    clickColumns: function clickColumns() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('div.schemaEditors.ng-scope > div > div > button:nth-child(2)')
      .click();
    },

    waitForToastMessageGone: function waitForToastMessageGone() {
      var self = this;
      return common.tryForTime(defaultTimeout * 5, function tryingForTime() {
        return self.remote
        .setFindTimeout(100)
        .findAllByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
        .then(function toastMessage(messages) {
          if (messages.length > 0) {
            throw new Error('waiting for toast message to clear');
          } else {
            common.debug('now messages = 0 "' + messages + '"');
            return messages;
          }
        });
      });
    },

    waitForVisualization: function waitForVisualization() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('visualize-legend');
    }

  };

  return VisualizePage;
});
