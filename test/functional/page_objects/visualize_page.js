export function VisualizePageProvider({ getService, getPageObjects }) {
  const remote = getService('remote');
  const config = getService('config');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header']);
  const defaultFindTimeout = config.get('timeouts.find');

  class VisualizePage {
    clickAreaChart() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByPartialLinkText('Area')
      .click();
    }

    clickDataTable() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByPartialLinkText('Data Table')
      .click();
    }

    clickLineChart() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByPartialLinkText('Line')
      .click();
    }


    clickRegionMap() {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByPartialLinkText('Region Map')
        .click();
    }

    getVectorMapData() {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findAllByCssSelector('path.leaflet-clickable')
        .then((chartTypes) => {


          function getChartType(chart) {
            let color;
            return chart.getAttribute('fill')
              .then((stroke) => {
                color = stroke;
              })
              .then(() => {
                return { color: color };
              });
          }

          const getChartTypesPromises = chartTypes.map(getChartType);
          return Promise.all(getChartTypesPromises);
        })
        .then((data) => {
          data = data.filter((country) => {
            //filter empty colors
            return country.color !== 'rgb(200,200,200)';
          });
          return data;
        });
    }

    clickMarkdownWidget() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByPartialLinkText('Markdown')
      .click();
    }

    clickAddMetric() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('[group-name="metrics"] [data-test-subj="visualizeEditorAddAggregationButton"]')
      .click();
    }

    clickMetric() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByPartialLinkText('Metric')
      .click();
    }

    clickGauge() {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByPartialLinkText('Gauge')
        .click();
    }

    clickPieChart() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByPartialLinkText('Pie')
      .click();
    }

    clickTileMap() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByPartialLinkText('Coordinate Map')
      .click();
    }

    clickTagCloud() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByPartialLinkText('Tag Cloud')
      .click();
    }

    getTextTag() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findAllByCssSelector('text').getVisibleText();
    }


    getTextSizes() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findAllByCssSelector('text')
      .then(function (tags) {
        function returnTagSize(tag) {
          return tag.getAttribute('style')
          .then(function (style) {
            return style.match(/font-size: ([^;]*);/)[1];
          });
        }
        return Promise.all(tags.map(returnTagSize));
      });
    }


    clickVerticalBarChart() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByPartialLinkText('Vertical Bar')
      .click();
    }

    clickHeatmapChart() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByPartialLinkText('Heat Map')
      .click();
    }

    getChartTypeCount() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findAllByCssSelector('a.wizard-vis-type.ng-scope')
      .length;
    }

    getChartTypes() {
      return testSubjects.findAll('visualizeWizardChartTypeTitle')
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
      return remote
      .setFindTimeout(defaultFindTimeout * 2)
      .findByCssSelector('ul.nav.nav-pills.nav-stacked.kbn-timepicker-modes:contains("absolute")')
      .click();
    }

    setFromTime(timeString) {
      return remote
      .setFindTimeout(defaultFindTimeout * 2)
      .findByCssSelector('input[ng-model="absolute.from"]')
      .clearValue()
      .type(timeString);
    }

    setToTime(timeString) {
      return remote
      .setFindTimeout(defaultFindTimeout * 2)
      .findByCssSelector('input[ng-model="absolute.to"]')
      .clearValue()
      .type(timeString);
    }

    clickGoButton() {
      return testSubjects.click('timepickerGoButton');
    }

    collapseChart() {
      return testSubjects.click('spyToggleButton');
    }

    getMetric() {
      return remote
      .setFindTimeout(2000)
      .findByCssSelector('div[ng-controller="KbnMetricVisController"]')
      .getVisibleText();
    }

    getGaugeValue() {
      return remote
        .setFindTimeout(2000)
        .findAllByCssSelector('visualize .chart svg')
        .getVisibleText();
    }

    clickMetricEditor() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('button[aria-label="Open Editor"]')
      .click();
    }

    clickNewSearch() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('.list-group-item a')
      .click();
    }

    setValue(newValue) {
      return remote
      .setFindTimeout(defaultFindTimeout * 2)
      .findByCssSelector('button[ng-click="numberListCntr.add()"]')
      .click()
      .then(() => {
        return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector('input[ng-model="numberListCntr.getList()[$index]"]')
        .clearValue();
      })
      .then(() => {
        return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector('input[ng-model="numberListCntr.getList()[$index]"]')
        .type(newValue);
      });
    }

    clickSavedSearch() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('li[ng-click="stepTwoMode=\'saved\'"]')
      .click();
    }

    selectSearch(searchName) {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByLinkText(searchName)
      .click();
    }


    getErrorMessage() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('.item>h4')
      .getVisibleText();
    }

    // clickBucket(bucketType) 'X-Axis', 'Split Area', 'Split Chart'
    clickBucket(bucketName) {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findAllByCssSelector('li.list-group-item.list-group-menu-item.ng-binding.ng-scope')
      .then(chartTypes => {
        log.debug('found bucket types ' + chartTypes.length);

        function getChartType(chart) {
          return chart
          .getVisibleText()
          .then(chartString => {
            //log.debug(chartString);
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
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('vis-editor-agg-params:not(.ng-hide) option[label="' + myString + '"]')
      .click();
    }

    getField() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('.ng-valid-required[name="field"] .ui-select-match-text')
      .getVisibleText();
    }

    selectField(fieldValue, groupName = 'buckets') {
      return retry.try(function tryingForTime() {
        return remote
          .setFindTimeout(defaultFindTimeout)
          .findByCssSelector(`[group-name="${groupName}"] .ui-select-container`)
          .click()
          .then(() => {
            return remote
              .findByCssSelector(`[group-name="${groupName}"] input.ui-select-search`)
              .type(fieldValue)
              .pressKeys('\uE006');
          });
      });
    }

    selectFieldById(fieldValue, id) {
      return retry.try(function tryingForTime() {
        return remote
          .setFindTimeout(defaultFindTimeout)
          // the css below should be more selective
          .findByCssSelector(`#${id} > option[label="${fieldValue}"]`)
          .click();
      });
    }

    orderBy(fieldValue) {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('select.form-control.ng-pristine.ng-valid.ng-untouched.ng-valid-required[ng-model="agg.params.orderBy"] ' +
        'option.ng-binding.ng-scope:contains("' + fieldValue + '")'
      )
      .click();
    }

    selectOrderBy(fieldValue) {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('select[name="orderBy"] > option[value="' + fieldValue + '"]')
      .click();
    }


    getInterval() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('select[ng-model="agg.params.interval"]')
      .getProperty('selectedIndex')
      .then(selectedIndex => {
        return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector('select[ng-model="agg.params.interval"] option:nth-child(' + (selectedIndex + 1) + ')')
        .getProperty('label');
      });
    }

    setInterval(newValue) {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('select[ng-model="agg.params.interval"]')
      .type(newValue);
    }

    setNumericInterval(newValue) {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[name="interval"]')
      .type(newValue);
    }

    clickGo() {
      return testSubjects.click('visualizeEditorRenderButton')
      .then(function () {
        return PageObjects.header.waitUntilLoadingHasFinished();
      });
    }

    clickOptions() {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByPartialLinkText('Options')
        .click();
    }

    selectWMS() {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector('input[name="wms.enabled"]')
        .click();
    }


    saveVisualization(vizName) {
      return testSubjects.click('visualizeSaveButton')
      .then(() => {
        return PageObjects.common.sleep(1000);
      })
      .then(() => {
        log.debug('saveButton button clicked');
        return remote
        .setFindTimeout(defaultFindTimeout)
        .findByName('visTitle')
        .type(vizName);
      })
      //   // click save button
      .then(() => {
        log.debug('click submit button');
        return testSubjects.click('saveVisualizationButton');
      })
      .then(function () {
        return PageObjects.header.waitUntilLoadingHasFinished();
      })
      // verify that green message at the top of the page.
      // it's only there for about 5 seconds
      .then(() => {
        return retry.try(function tryingForTime() {
          return remote
          .setFindTimeout(defaultFindTimeout)
          .findByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
          .getVisibleText();
        });
      });
    }

    clickLoadSavedVisButton() {
      // TODO: Use a test subject selector once we rewrite breadcrumbs to accept each breadcrumb
      // element as a child instead of building the breadcrumbs dynamically.
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('[href="#/visualize"]')
      .click();
    }

    filterVisByName(vizName) {
      return remote
      .findByCssSelector('input[name="filter"]')
      .click()
      // can't uses dashes in saved visualizations when filtering
      // or extended character sets
      // https://github.com/elastic/kibana/issues/6300
      .type(vizName.replace('-',' '));
    }

    clickVisualizationByName(vizName) {
      log.debug('clickVisualizationByLinkText(' + vizName + ')');

      return retry.try(function tryingForTime() {
        return remote
        .setFindTimeout(defaultFindTimeout)
        .findByPartialLinkText(vizName)
        .click();
      });
    }

    // this starts by clicking the Load Saved Viz button, not from the
    // bottom half of the "Create a new visualization      Step 1" page
    loadSavedVisualization(vizName) {
      return this.clickLoadSavedVisButton()
      .then(() => this.openSavedVisualization(vizName));
    }

    openSavedVisualization(vizName) {
      return this.clickVisualizationByName(vizName);
    }

    getXAxisLabels() {
      return remote
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
        // log.debug('returning types array ' + texts + ' array length =' + texts.length);
        return texts;
      });
    }


    getYAxisLabels() {
      return remote
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
        // log.debug('returning types array ' + texts + ' array length =' + texts.length);
        return texts;
      });
    }


    /*
     ** This method gets the chart data and scales it based on chart height and label.
     ** Returns an array of height values
     */
    getAreaChartData(aggregateName) {
      const chartData = [];
      let tempArray = [];
      let chartSections = 0;
      let yAxisLabel = 0;
      let yAxisHeight = 0;

      // 1). get the maximim chart Y-Axis marker value
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('div.y-axis-div-wrapper > div > svg > g > g:last-of-type')
      .getVisibleText()
      .then(function (yLabel) {
        // since we're going to use the y-axis 'last' (top) label as a number to
        // scale the chart pixel data, we need to clean out commas and % marks.
        yAxisLabel = yLabel.replace(/(%|,)/g, '');
        log.debug('yAxisLabel = ' + yAxisLabel);
        return yLabel;
      })
      // 2). find and save the y-axis pixel size (the chart height)
      .then(function () {
        return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector('rect.background') // different here
        .getAttribute('height');
      })
      .then(function (chartH) {
        yAxisHeight = chartH;
        log.debug('height --------- ' + yAxisHeight);
      })
      .then(function () {
        return remote.setFindTimeout(defaultFindTimeout * 2)
        .findByCssSelector('path[data-label="' + aggregateName + '"]')
        .getAttribute('d');
      })
      .then(function (data) {
        log.debug(data);
        // This area chart data starts with a 'M'ove to a x,y location, followed
        // by a bunch of 'L'ines from that point to the next.  Those points are
        // the values we're going to use to calculate the data values we're testing.
        // So git rid of the one 'M' and split the rest on the 'L's.
        tempArray = data.replace('M','').split('L');
        chartSections = tempArray.length / 2;
        log.debug('chartSections = ' + chartSections + ' height = ' + yAxisHeight + ' yAxisLabel = ' + yAxisLabel);
        for (let i = 0; i < chartSections; i++) {
          chartData[i] = Math.round((yAxisHeight - tempArray[i].split(',')[1]) / yAxisHeight * yAxisLabel);
          log.debug('chartData[i] =' + chartData[i]);
        }
        return chartData;
      });
    }


    // The current test shows dots, not a line.  This function gets the dots and normalizes their height.
    getLineChartData(cssPart, axis = 'ValueAxis-1') {
      let yAxisLabel = 0;
      let yAxisHeight;

      // 1). get the maximim chart Y-Axis marker value
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector(`div.y-axis-div-wrapper > div > svg > g.${axis} > g:last-of-type`)
        .getVisibleText()
        .then(function (yLabel) {
          yAxisLabel = yLabel.replace(/,/g, '');
          log.debug('yAxisLabel = ' + yAxisLabel);
          return yLabel;
        })
        // 2). find and save the y-axis pixel size (the chart height)
        .then(function getRect() {
          return remote
          .setFindTimeout(defaultFindTimeout)
          .findByCssSelector('clipPath rect')
          .getAttribute('height')
          .then(function (theHeight) {
            yAxisHeight = theHeight;
            log.debug('theHeight = ' + theHeight);
            return theHeight;
          });
        })
        // 3). get the chart-wrapper elements
        .then(function getChartWrapper() {
          return remote
          .setFindTimeout(defaultFindTimeout * 2)
          .findAllByCssSelector(`.chart-wrapper circle[${cssPart}]`)
          .then(function (chartTypes) {

            // 5). for each chart element, find the green circle, then the cy position
            function getChartType(chart) {
              return chart
              .getAttribute('cy')
              .then(function (cy) {
                // log.debug(' yAxisHeight=' + yAxisHeight + ' yAxisLabel=' + yAxisLabel + '  cy=' + cy +
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
      let yAxisLabel = 0;
      let yAxisHeight;

      // 1). get the maximim chart Y-Axis marker value
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('div.y-axis-div-wrapper > div > svg > g > g:last-of-type')
      .then(function setYAxisLabel(y) {
        return y
        .getVisibleText()
        .then(function (yLabel) {
          yAxisLabel = yLabel.replace(',', '');
          log.debug('yAxisLabel = ' + yAxisLabel);
          return yLabel;
        });
      })
      // 2). find and save the y-axis pixel size (the chart height)
      .then(function getRect() {
        return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector('rect.background')
        .then(function getRectHeight(chartAreaObj) {
          return chartAreaObj
          .getAttribute('height')
          .then(function (theHeight) {
            yAxisHeight = theHeight;
            log.debug('theHeight = ' + theHeight);
            return theHeight;
          });
        });
      })
      // 3). get the chart-wrapper elements
      .then(function () {
        return remote
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

    getHeatmapData() {
      // 1). get the maximim chart Y-Axis marker value
      return remote
      .setFindTimeout(defaultFindTimeout * 2)
      // #kibana-body > div.content > div > div > div > div.vis-editor-canvas > visualize > div.visualize-chart > div > div.vis-col-wrapper > div.chart-wrapper > div > svg > g > g.series.\30 > rect:nth-child(1)
      .findAllByCssSelector('svg > g > g.series rect') // rect
      .then(function (chartTypes) {
        log.debug('rects=' + chartTypes);
        function getChartType(chart) {
          return chart
          .getAttribute('data-label');
        }
        const getChartTypesPromises = chartTypes.map(getChartType);
        return Promise.all(getChartTypesPromises);
      })
      .then(function (labels) {
        log.debug('labels=' + labels);
        return labels;
      });
    }

    getPieChartData() {
      // 1). get the maximim chart Y-Axis marker value
      return remote
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
        log.debug('slices=' + slices);
        return slices;
      });
    }

    getChartAreaWidth() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('clipPath rect')
      .getAttribute('width');
    }
    getChartAreaHeight() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('clipPath rect')
      .getAttribute('height');
    }

    getDataTableData() {
      return remote
      .setFindTimeout(defaultFindTimeout * 2)
      .findByCssSelector('table.table.table-condensed tbody')
      .getVisibleText();
    }

    getMarkdownData() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('visualize.ng-isolate-scope')
      .getVisibleText();
    }

    clickColumns() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('div.schemaEditors.ng-scope > div > div > button:nth-child(2)')
      .click();
    }

    waitForToastMessageGone() {
      return retry.try(function tryingForTime() {
        return remote
        .setFindTimeout(100)
        .findAllByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
        .then(function toastMessage(messages) {
          if (messages.length > 0) {
            throw new Error('waiting for toast message to clear');
          } else {
            log.debug('now messages = 0 "' + messages + '"');
            return messages;
          }
        });
      });
    }

    waitForVisualization() {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('visualize-legend');
    }

    clickMapButton(zoomSelector) {
      return remote
      .setFindTimeout(defaultFindTimeout)
      .findAllByCssSelector(zoomSelector)
      .click()
      .then(() => {
        return PageObjects.common.sleep(1000);
      })
      .then(() => {
        return PageObjects.header.waitUntilLoadingHasFinished();
      });
    }

    clickMapZoomIn() {
      return this.clickMapButton('a.leaflet-control-zoom-in');
    }

    clickMapZoomOut() {
      return this.clickMapButton('a.leaflet-control-zoom-out');
    }

    getMapZoomEnabled(zoomSelector) {
      return remote
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
      return remote
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

  return new VisualizePage();
}
