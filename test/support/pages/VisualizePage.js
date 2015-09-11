// in test/support/pages/DiscoverPage.js
define([
  'intern/chai!assert'
], function (assert, require) {
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
        .findAllByXpath('.//*[@id=\'kibana-body\']/div[2]/div/div/div/a')
        .then(function (chartTypes) {
          return chartTypes
            .length;
        });
    },

    getChartTypes: function () {
      var types = [];
      return this.remote
        .setFindTimeout(5000)
        .findAllByXpath('.//h4[@class=\'ng-binding\']')
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

    clickNewSearch: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//li[@ng-click=\"stepTwoMode=\'new\'\"]')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    clickSavedSearch: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//li[@ng-click=\"stepTwoMode=\'saved\'\"]')
        .then(function (chart) {
          return chart
            .click();
        });
    },

    getErrorMessage: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//visualize[@class=\'ng-isolate-scope only-visualization\']')
        .then(function (chart) {
          return chart
            .getVisibleText();
        });
    },

    // clickBucket(bucketType) 'X-Axis', 'Split Area', 'Split Chart'
    clickBucket: function (bucketName) {
      return this.remote
        .setFindTimeout(5000)
        .findAllByXpath('.//*[@id=\'kibana-body\']/div[2]/div/div/div/vis-editor-sidebar' +
          '/div/form/div[2]/vis-editor-agg-group[2]/div/div[2]/vis-editor-agg-add/div[1]/ul/li')
        .then(function (chartTypes) {
          function getChartType(chart) {
            return chart
              .getVisibleText()
              .then(function (chartString) {
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
        .findByXpath(
          './/*[@id=\'kibana-body\']/div[2]/div/div/div/vis-editor-sidebar/div/form/div[2]/' +
          'vis-editor-agg-group[2]/div/div[2]/div/ng-form/vis-editor-agg-params/div[2]/select'
        )
        .then(function (selectList) {
          return selectList
            .click();
        })
        .then(function () {
          return self.remote
            .setFindTimeout(5000)
            .findByXpath('//option[@label=\'' + myString + '\']')
            .then(function (option) {
              return option
                .click();
            });
        });
    },

    selectAggregation2: function (myString) {
      var self = this;
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//option[@label=\'' + myString + '\']')
        .then(function (option) {
          return option
            .click();
        });
    },

    getField: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//select[@name=\'field\']/optgroup/option[@selected=\'selected\']')
        .then(function (field) {
          return field
            .getVisibleText();
        });
    },

    getInterval: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//select[@ng-model=\'agg.params.interval\']/option[@selected=\'selected\']')
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
        .findByXpath('//button[@aria-label=\'Save Visualization\']')
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
                .findByXpath('.//*[@id=\'kibana-body\']/div[1]/ul/li/div/kbn-truncated')
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
        .findByXpath('//button[@aria-label=\'Load Saved Visualization\']')
        .then(function (loadButton) {
          return loadButton
            .click();
        })
        .then(function () {
          console.log('Load Saved Vis button clicked ' + Date.now());
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
        .findByXpath('.//*[@id=\'kibana-body\']/div[2]/div/div/div/div/visualize/div[2]/div/div[2]/div[3]/div[1]/div')
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
        .findByXpath('.//*[@id=\'kibana-body\']/div[2]/div/div/div/div/visualize/div[2]/div/div[1]/div[1]/div[2]/div')
        .then(function (yAxis) {
          return yAxis
            .getVisibleText()
            .then(function (yAxisText) {
              //console.log('yAxisText here = ' + yAxisText);
              return yAxisText;
            });
        });
    },

    getChartData: function () {
      var types = [];
      return this.remote
        .setFindTimeout(5000)
        // .findAllByXpath('//*[@id=\'kibana-body\']/div[2]/div/div/div/div/visualize/div[2]/div/div[2]/div[1]/div/svg/g/g')
        .findAllByXpath('//*[local-name()=\'path\']') // findAll ? g returned 32, path returned 3

      //.findAllByXpath('//*[@id=\'kibana-body\']/div[2]/div/div/div/div/visualize/div[2]/div/div[1]/div[1]/div[2]/div/svg/g/g[8]/text') // findAll ? g returned 32, path returned 3
      // //*[@id="kibana-body"]/div[2]/div/div/div/div/visualize/div[2]/div/div[1]/div[1]/div[2]/div/svg/g/g[8]/text

      .then(function (chartTypes) {
          function getChartType(chart) {
            return chart
              .getAttribute('d')
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

    getChartData2: function () {
      return this.remote
        .setFindTimeout(15000)
        // .findByXpath('//*[@id=\'kibana-body\']/div[2]/div/div/div/div/visualize/div[2]/div/div[2]/div[1]/div/svg/g/g[4]')  NoSuchElement
        .findAllByXpath('.//*[@id=\'kibana-body\']/div[2]/div/div/div/div/visualize/div[2]/div/div[2]/div[1]/div/svg/g/g[1]') /// returned 0
        // .findAllByXpath('//*[@id=\'kibana-body\']/div[2]/div/div/div/div/visualize/div[2]/div/div[2]/div[1]/div/svg/g/g') // findAll ? length = 0 ???
        // .findAllByXpath('//*[@id=\'kibana-body\']/div[2]/div/div/div/div/visualize/div[2]/div/div[2]/div[1]/div/svg') // findAll ? // returned 0 - WHY???
        // .findAllByXpath('//*[name()=\'svg\']') // findAll ? returned 5
        // .findAllByXpath('//*[name()=\'path\']') // findAll ? returned 3
        // .findAllByXpath('//*[name()=\'g\']') // findAll ? returned 32
        // .findAllByXpath('//*[@id=\'kibana-body\']/div[2]/div/div/div/div/visualize/div[2]/div/div[2]/div[1]/div') // findAll ? // returned 1

      // .findByCssSelector('.pathgroup > path:nth-child(1)')  // no errors on this, but also no data below
      // .findByCssSelector('.pathgroup') // no errors on this, but also no data below

      // .findByCssSelector('#kibana-body > div.content > div > div > div > div > visualize > div.visualize-chart > div > div.vis-col-wrapper > div.chart-wrapper > div > svg > g > g.pathgroup.\\30')
      // #kibana-body > div.content > div > div > div > div > visualize > div.visualize-chart > div > div.vis-col-wrapper > div.chart-wrapper > div > svg > g > g.pathgroup.\30 > path
      // //*[@id="kibana-body"]/div[2]/div/div/div/div/visualize/div[2]/div/div[2]/div[1]/div/svg/g/g[4]/path

      // .findByCssSelector('g.pathgroup.0')   'g.pathgroup.0' is not a valid selector.
      // .findByCssSelector('pathgroup.0') 'pathgroup.0' is not a valid selector.
      // .findByCssSelector('.pathgroup.0')  '.pathgroup.0' is not a valid selector.


      // .findByClassName('pathgroup 0')
      .then(function (yAxis) {
        return yAxis
          .length;
        // .then(function (yAxisText) {
        //   console.log('Data here = ' + yAxisText);
        //   return yAxisText;
        // });
      });
    }

    // …additional page interaction tasks…
  };

  return VisualizePage;
});
