
import {
  defaultFindTimeout,
} from '../';

import PageObjects from './';

export default class VisualizePage {

  init(remote) {
    this.remote = remote;
  }

  clickAreaChart() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByPartialLinkText('Area chart')
    .click();
  }

  clickDataTable() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByPartialLinkText('Data table')
    .click();
  }

  clickLineChart() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByPartialLinkText('Line chart')
      .click();
  }

  clickMarkdownWidget() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByPartialLinkText('Markdown widget')
    .click();
  }

  clickMetric() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByPartialLinkText('Metric')
    .click();
  }

  clickPieChart() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByPartialLinkText('Pie chart')
    .click();
  }

  clickTileMap() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByPartialLinkText('Tile map')
    .click();
  }

  clickVerticalBarChart() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByPartialLinkText('Vertical bar chart')
    .click();
  }

  getChartTypeCount() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('a.wizard-vis-type.ng-scope')
    .length;
  }

  getChartTypes() {

    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('.wizard-type-heading h4')
    .then(function (chartTypes) {
      function getChartType(chart) {
        return chart.getVisibleText();
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return Promise.all(getChartTypesPromises);
    })
    .then(function (texts) {
      return texts;
    });
  }

  clickAbsoluteButton() {
    return this.remote
    .setFindTimeout(defaultFindTimeout * 2)
    .findByCssSelector('ul.nav.nav-pills.nav-stacked.kbn-timepicker-modes:contains("absolute")')
    .click();
  }

  setFromTime(timeString) {
    return this.remote
    .setFindTimeout(defaultFindTimeout * 2)
    .findByCssSelector('input[ng-model="absolute.from"]')
    .clearValue()
    .type(timeString);
  }

  setToTime(timeString) {
    return this.remote
    .setFindTimeout(defaultFindTimeout * 2)
    .findByCssSelector('input[ng-model="absolute.to"]')
    .clearValue()
    .type(timeString);
  }

  clickGoButton() {
    return this.remote
    .setFindTimeout(defaultFindTimeout * 2)
    .findByClassName('kbn-timepicker-go')
    .click();
  }

  collapseChart() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('div.visualize-show-spy > div > i')
    .click();
  }

  getMetric() {
    return this.remote
    .setFindTimeout(2000)
    .findByCssSelector('div[ng-controller="KbnMetricVisController"]')
    .getVisibleText();
  }

  clickMetricEditor() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button[aria-label="Open Editor"]')
    .click();
  }

  clickNewSearch() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('.list-group-item a')
    .click();
  }

  setValue(newValue) {
    return this.remote
    .setFindTimeout(defaultFindTimeout * 2)
    .findByCssSelector('button[ng-click="numberListCntr.add()"]')
    .click()
    .then(() => {
      return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model="numberListCntr.getList()[$index]"]')
      .clearValue();
    })
    .then(() => {
      return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model="numberListCntr.getList()[$index]"]')
      .type(newValue);
    });
  }

  clickSavedSearch() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('li[ng-click="stepTwoMode=\'saved\'"]')
    .click();
  }

  selectSearch(searchName) {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByLinkText(searchName)
    .click();
  }


  getErrorMessage() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('.item>h4')
    .getVisibleText();
  }

  // clickBucket(bucketType) 'X-Axis', 'Split Area', 'Split Chart'
  clickBucket(bucketName) {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('li.list-group-item.list-group-menu-item.ng-binding.ng-scope')
    .then(chartTypes => {
      PageObjects.common.debug('found bucket types ' + chartTypes.length);

      function getChartType(chart) {
        return chart
        .getVisibleText()
        .then(chartString => {
          //PageObjects.common.debug(chartString);
          if (chartString === bucketName) {
            chart.click();
          }
        });
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return Promise.all(getChartTypesPromises);
    });
  }

  selectAggregation(myString) {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('option[label="' + myString + '"]')
    .click();
  }

  getField() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('.ng-valid-required[name="field"] option[selected="selected"]')
    .getVisibleText();
  }

  selectField(fieldValue) {
    const self = this;
    return PageObjects.common.try(function tryingForTime() {
      return self.remote
      .setFindTimeout(defaultFindTimeout)
      // the css below should be more selective
      .findByCssSelector('option[label="' + fieldValue + '"]')
      .click();
    });
  }

  orderBy(fieldValue) {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('select.form-control.ng-pristine.ng-valid.ng-untouched.ng-valid-required[ng-model="agg.params.orderBy"] ' +
      'option.ng-binding.ng-scope:contains("' + fieldValue + '")'
    )
    .click();
  }

  selectOrderBy(fieldValue) {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('select[name="orderBy"] > option[value="' + fieldValue + '"]')
    .click();
  }


  getInterval() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('select[ng-model="agg.params.interval"]')
    .getProperty('selectedIndex')
    .then(selectedIndex => {
      return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('select[ng-model="agg.params.interval"] option:nth-child(' + (selectedIndex + 1) + ')')
      .getProperty('label');
    });
  }

  setInterval(newValue) {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('select[ng-model="agg.params.interval"]')
    .type(newValue);
  }

  setNumericInterval(newValue) {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('input[name="interval"]')
    .type(newValue);
  }

  clickGo() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('.btn-success')
    .click()
    .then(function () {
      return PageObjects.header.isGlobalLoadingIndicatorHidden();
    });
  }

  clickNewVisualization() {
    return PageObjects.common.findTestSubject('visualizeNewButton')
    .click();
  }

  saveVisualization(vizName) {
    return PageObjects.common.findTestSubject('visualizeSaveButton')
    .click()
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    .then(() => {
      PageObjects.common.debug('saveButton button clicked');
      return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByName('visTitle')
      .type(vizName);
    })
    //   // click save button
    .then(() => {
      PageObjects.common.debug('click submit button');
      return PageObjects.common.findTestSubject('saveVisualizationButton')
      .click();
    })
    .then(function () {
      return PageObjects.header.isGlobalLoadingIndicatorHidden();
    })
    // verify that green message at the top of the page.
    // it's only there for about 5 seconds
    .then(() => {
      const self = this;
      return PageObjects.common.try(function tryingForTime() {
        return self.remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
        .getVisibleText();
      });
    });
  }

  clickLoadSavedVisButton() {
    return PageObjects.common.findTestSubject('visualizeOpenButton')
      .click();
  }

  filterVisByName(vizName) {
    return this.remote
      .findByCssSelector('input[name="filter"]')
      .click()
      // can't uses dashes in saved visualizations when filtering
      // or extended character sets
      // https://github.com/elastic/kibana/issues/6300
      .type(vizName.replace('-',' '));
  }

  clickVisualizationByLinkText(vizName) {
    const self = this;
    PageObjects.common.debug('clickVisualizationByLinkText(' + vizName + ')');

    return PageObjects.common.try(function tryingForTime() {
      return self.remote
      .setFindTimeout(defaultFindTimeout)
      .findByLinkText(vizName)
      .click();
    });
  }

  // this starts by clicking the Load Saved Viz button, not from the
  // bottom half of the "Create a new visualization      Step 1" page
  loadSavedVisualization(vizName) {
    const self = this;
    return this.clickLoadSavedVisButton()
    .then(function filterVisualization() {
      return self.openSavedVisualization(vizName);
    });
  }

  // this is for starting on the
  // bottom half of the "Create a new visualization      Step 1" page
  openSavedVisualization(vizName) {
    const self = this;
    return self.filterVisByName(vizName)
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    .then(function clickDashboardByLinkedText() {
      return self.clickVisualizationByLinkText(vizName);
    });
  }

  getXAxisLabels() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('.x > g')
    .then(chartTypes => {
      function getChartType(chart) {
        return chart
        .getVisibleText();
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return Promise.all(getChartTypesPromises);
    })
    .then(texts => {
      // PageObjects.common.debug('returning types array ' + texts + ' array length =' + texts.length);
      return texts;
    });
  }


  getYAxisLabels() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('.y > g')
    .then(chartTypes => {
      function getChartType(chart) {
        return chart
        .getVisibleText();
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return Promise.all(getChartTypesPromises);
    })
    .then(texts => {
      // PageObjects.common.debug('returning types array ' + texts + ' array length =' + texts.length);
      return texts;
    });
  }


  /*
   ** This method gets the chart data and scales it based on chart height and label.
   ** Returns an array of height values
   */
  getAreaChartData(aggregateName) {
    const self = this.remote;
    const chartData = [];
    let tempArray = [];
    let chartSections = 0;
    const height = 0;
    let yAxisLabel = 0;
    let yAxisHeight = 0;

    // 1). get the maximim chart Y-Axis marker value
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('div.y-axis-div-wrapper > div > svg > g > g:last-of-type')
    .getVisibleText()
    .then(function (yLabel) {
      // since we're going to use the y-axis 'last' (top) label as a number to
      // scale the chart pixel data, we need to clean out commas and % marks.
      yAxisLabel = yLabel.replace(/(%|,)/g, '');
      PageObjects.common.debug('yAxisLabel = ' + yAxisLabel);
      return yLabel;
    })
    // 2). find and save the y-axis pixel size (the chart height)
    .then(function () {
      return self
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('rect.background') // different here
      .getAttribute('height');
    })
    .then(function (chartH) {
      yAxisHeight = chartH;
      PageObjects.common.debug('height --------- ' + yAxisHeight);
    })
    .then(function () {
      return self.setFindTimeout(defaultFindTimeout * 2)
      .findByCssSelector('path[data-label="' + aggregateName + '"]')
      .getAttribute('d');
    })
    .then(function (data) {
      PageObjects.common.debug(data);
      // This area chart data starts with a 'M'ove to a x,y location, followed
      // by a bunch of 'L'ines from that point to the next.  Those points are
      // the values we're going to use to calculate the data values we're testing.
      // So git rid of the one 'M' and split the rest on the 'L's.
      tempArray = data.replace('M','').split('L');
      chartSections = tempArray.length / 2;
      PageObjects.common.debug('chartSections = ' + chartSections + ' height = ' + yAxisHeight + ' yAxisLabel = ' + yAxisLabel);
      for (let i = 0; i < chartSections; i++) {
        chartData[i] = Math.round((yAxisHeight - tempArray[i].split(',')[1]) / yAxisHeight * yAxisLabel);
        PageObjects.common.debug('chartData[i] =' + chartData[i]);
      }
      return chartData;
    });
  }


  // The current test shows dots, not a line.  This function gets the dots and normalizes their height.
  getLineChartData(cssPart) {
    const self = this.remote;
    let yAxisLabel = 0;
    let yAxisHeight;

    // 1). get the maximim chart Y-Axis marker value
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('div.y-axis-div-wrapper > div > svg > g > g:last-of-type')
      .getVisibleText()
      .then(function (yLabel) {
        yAxisLabel = yLabel.replace(',', '');
        PageObjects.common.debug('yAxisLabel = ' + yAxisLabel);
        return yLabel;
      })
      // 2). find and save the y-axis pixel size (the chart height)
      .then(function getRect() {
        return self
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector('clipPath rect')
        .getAttribute('height')
        .then(function (theHeight) {
          yAxisHeight = theHeight;
          PageObjects.common.debug('theHeight = ' + theHeight);
          return theHeight;
        });
      })
      // 3). get the chart-wrapper elements
      .then(function getChartWrapper() {
        return self
        .setFindTimeout(defaultFindTimeout * 2)
        .findAllByCssSelector('.chart-wrapper')
        .then(function (chartTypes) {

          // 5). for each chart element, find the green circle, then the cy position
          function getChartType(chart) {
            return chart
            .findByCssSelector(`circle[${cssPart}]`)
            .then(function (circleObject) {
              // PageObjects.common.debug('circleObject = ' + circleObject + ' yAxisHeight= ' + yAxisHeight + ' yAxisLabel= ' + yAxisLabel);
              return circleObject
              .getAttribute('cy');
            })
            .then(function (cy) {
              // PageObjects.common.debug(' yAxisHeight=' + yAxisHeight + ' yAxisLabel=' + yAxisLabel + '  cy=' + cy +
              //   ' ((yAxisHeight - cy)/yAxisHeight * yAxisLabel)=' + ((yAxisHeight - cy) / yAxisHeight * yAxisLabel));
              return Math.round((yAxisHeight - cy) / yAxisHeight * yAxisLabel);
            });
          }

          // 4). pass the chartTypes to the getChartType function
          const getChartTypesPromises = chartTypes.map(getChartType);
          return Promise.all(getChartTypesPromises);
        });
      })

    .then(function (yCoords) {
      return yCoords;
    });
  }


  // this is ALMOST identical to DiscoverPage.getBarChartData
  getBarChartData() {
    const self = this.remote;
    let yAxisLabel = 0;
    let yAxisHeight;

    // 1). get the maximim chart Y-Axis marker value
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('div.y-axis-div-wrapper > div > svg > g > g:last-of-type')
    .then(function setYAxisLabel(y) {
      return y
      .getVisibleText()
      .then(function (yLabel) {
        yAxisLabel = yLabel.replace(',', '');
        PageObjects.common.debug('yAxisLabel = ' + yAxisLabel);
        return yLabel;
      });
    })
    // 2). find and save the y-axis pixel size (the chart height)
    .then(function getRect() {
      return self
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('rect.background')
      .then(function getRectHeight(chartAreaObj) {
        return chartAreaObj
        .getAttribute('height')
        .then(function (theHeight) {
          yAxisHeight = theHeight; // - 5; // MAGIC NUMBER - clipPath extends a bit above the top of the y-axis and below x-axis
          PageObjects.common.debug('theHeight = ' + theHeight);
          return theHeight;
        });
      });
    })
    // 3). get the chart-wrapper elements
    .then(function () {
      return self
      .setFindTimeout(defaultFindTimeout * 2)
      // #kibana-body > div.content > div > div > div > div.vis-editor-canvas > visualize > div.visualize-chart > div > div.vis-col-wrapper > div.chart-wrapper > div > svg > g > g.series.\30 > rect:nth-child(1)
      .findAllByCssSelector('svg > g > g.series > rect') // rect
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
        const getChartTypesPromises = chartTypes.map(getChartType);
        return Promise.all(getChartTypesPromises);
      })
      .then(function (bars) {
        return bars;
      });
    });
  }

  getPieChartData() {
    // 1). get the maximim chart Y-Axis marker value
    return this.remote
    .setFindTimeout(defaultFindTimeout * 2)
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
      const getChartTypesPromises = chartTypes.map(getChartType);
      return Promise.all(getChartTypesPromises);
    })
    .then(function (slices) {
      PageObjects.common.debug('slices=' + slices);
      return slices;
    });
  }

  getChartAreaWidth() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('clipPath rect')
    .getAttribute('width');
  }
  getChartAreaHeight() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('clipPath rect')
    .getAttribute('height');
  }

  getDataTableData() {
    return this.remote
    .setFindTimeout(defaultFindTimeout * 2)
    .findByCssSelector('table.table.table-condensed tbody')
    .getVisibleText();
  }

  getMarkdownData() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('visualize.ng-isolate-scope')
    .getVisibleText();
  }

  clickColumns() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('div.schemaEditors.ng-scope > div > div > button:nth-child(2)')
    .click();
  }

  waitForToastMessageGone() {
    const self = this;
    return PageObjects.common.try(function tryingForTime() {
      return self.remote
      .setFindTimeout(100)
      .findAllByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
      .then(function toastMessage(messages) {
        if (messages.length > 0) {
          throw new Error('waiting for toast message to clear');
        } else {
          PageObjects.common.debug('now messages = 0 "' + messages + '"');
          return messages;
        }
      });
    });
  }

  waitForVisualization() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('visualize-legend');
  }

  clickMapButton(zoomSelector) {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector(zoomSelector)
    .click()
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    .then(() => {
      return PageObjects.header.isGlobalLoadingIndicatorHidden();
    });
  }

  clickMapZoomIn() {
    return this.clickMapButton('a.leaflet-control-zoom-in');
  }

  clickMapZoomOut() {
    return this.clickMapButton('a.leaflet-control-zoom-out');
  }

  getMapZoomEnabled(zoomSelector) {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector(zoomSelector)
    .getAttribute('class')
    .then((element) => {
      return !element.toString().includes('leaflet-disabled');
    });
  }

  getMapZoomInEnabled() {
    return this.getMapZoomEnabled('a.leaflet-control-zoom-in');
  }

  getMapZoomOutEnabled() {
    return this.getMapZoomEnabled('a.leaflet-control-zoom-out');
  }

  clickMapFitDataBounds() {
    return this.clickMapButton('a.fa-crop');
  }

  getTileMapData() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('path.leaflet-clickable')
    .then((chartTypes) => {

      function getChartType(chart) {
        let color;
        let radius;
        return chart.getAttribute('stroke')
        .then((stroke) => {
          color = stroke;
        })
        .then(() => {
          return chart.getAttribute('d');
        })
        .then((d) => {
          // scale the radius up (sometimes less than 1) and then round to int
          radius = d.replace(/.*A(\d+\.\d+),.*/,'$1') * 10;
          radius = Math.round(radius);
        })
        .then(() => {
          return { color: color, radius: radius };
        });
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return Promise.all(getChartTypesPromises);
    })
    .then((circles) => {
      return circles;
    });
  }

}
