
import {
  defaultFindTimeout,
} from '../';

import PageObjects from './';

export default class VisualizePointSeriesOptions {

  init(remote) {
    this.remote = remote;
  }

  clickOptions() {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByPartialLinkText('Options')
      .click();
  }

  clickAddAxis() {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('button[aria-label="Add value axis"]')
      .click();
  }

  getValueAxesCount() {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findAllByCssSelector('.kuiSideBarSection:contains("Value Axes") > .kuiSideBarSection')
      .length;
  }

  getSeriesCount() {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findAllByCssSelector('.kuiSideBarSection:contains("Series") > .kuiSideBarSection')
      .length;
  }

  getRightValueAxes() {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findAllByCssSelector('.axis-wrapper-right g.axis')
      .then(function (data) {
        return Promise.all([function () { return data.length; }]);
      });
  }

  getHistogramSeries() {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findAllByCssSelector('.series.histogram')
      .then(function (data) {
        return Promise.all([function () { return data.length; }]);
      });
  }

  getGridLines() {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findAllByCssSelector('g.grid > path')
      .then(function (data) {
        function getGridLine(gridLine) {
          return gridLine
            .getAttribute('d')
            .then(dAttribute => {
              const firstPoint = dAttribute.split('L')[0].replace('M', '').split(',');
              return { x: parseFloat(firstPoint[0]), y: parseFloat(firstPoint[1]) };
            });
        }
        const promises = data.map(getGridLine);
        return Promise.all(promises);
      })
      .then(function (gridLines) {
        return gridLines;
      });
  }

  toggleGridCategoryLines() {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('#showCategoryLines')
      .click();
  }

  setGridValueAxis(axis) {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector(`select#gridAxis option[label="${axis}"]`)
      .click();
  }

  toggleCollapsibleTitle(title) {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findAllByCssSelector('.kuiSideBarCollapsibleTitle .kuiSideBarCollapsibleTitle__text')
      .then(sidebarTitles => {
        PageObjects.common.debug('found sidebar titles ' + sidebarTitles.length);
        function getTitle(titleDiv) {
          return titleDiv
            .getVisibleText()
            .then(titleString => {
              PageObjects.common.debug('sidebar title ' + titleString);
              if (titleString === title) {
                PageObjects.common.debug('clicking sidebar title ' + titleString);
                return titleDiv.click();
              }
            });
        }
        const sidebarTitlePromises = sidebarTitles.map(getTitle);
        return Promise.all(sidebarTitlePromises);
      });
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

  setValueAxisPosition(axis, position) {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector(`select#valueAxisPosition${axis} option[label="${position}"]`)
      .click();
  }

  setCategoryAxisPosition(newValue) {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector(`select#categoryAxisPosition option[label="${newValue}"]`)
      .click();
  }

  setSeriesAxis(series, axis) {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector(`select#seriesValueAxis${series} option[label="${axis}"]`)
      .click();
  }

  setSeriesType(series, type) {
    return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector(`select#seriesType${series} option[label="${type}"]`)
      .click();
  }

}
