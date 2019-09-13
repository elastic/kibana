import Keys from 'leadfoot/keys';
import Bluebird from 'bluebird';
import expect from 'expect.js';

import {
  defaultFindTimeout,
} from '../';

import PageObjects from './';

export default class SettingsPage {

  init(remote) {
    this.remote = remote;
  }

  clickNavigation() {
    // TODO: find better way to target the element
    return this.remote.findDisplayedByCssSelector('.app-link:nth-child(5) a').click();
  }

  clickLinkText(text) {
    return this.remote.findDisplayedByLinkText(text).click();
  }

  clickKibanaSettings() {
    return this.clickLinkText('Advanced Settings');
  }

  clickKibanaReporting() {
    return this.clickLinkText('Reporting');
  }

  clickKibanaIndicies() {
    return this.clickLinkText('Index Patterns');
  }

  clickExistingData() {
    return this.clickLinkText('Existing Data');
  }


  clickElasticsearchUsers() {
    return this.clickLinkText('Users');
  }

  clickElasticsearchRoles() {
    return this.clickLinkText('Roles');
  }

  getElasticsearchUsers() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('tr')
    .then(function (rows) {

      function returnUsers(chart) {
        return chart.getVisibleText();
      }

      const getUsers = rows.map(returnUsers);
      return Bluebird.all(getUsers);
    });
  }

  getElasticsearchRoles() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('tr')
    .then(function (rows) {

      function returnRoles(chart) {
        return chart.getVisibleText();
      }

      const getRoles = rows.map(returnRoles);
      return Bluebird.all(getRoles);
    });
  }


  clickNewUser() {
    return this.clickLinkText('New User');
  }


  clickNewRole() {
    return this.clickLinkText('New Role');
  }

  addUser(userObj) {
    const self = this;
    return this.clickNewUser()
    .then(function () {
      return PageObjects.common.sleep(4000);
    })
    .then(function () {
      return self.remote.setFindTimeout(defaultFindTimeout).findById('username')
      .type(userObj.username);
    })
    .then(function () {
      return self.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model="user.password"]')
      .type(userObj.password);
    })
    .then(function () {
      return self.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model="view.confirmPassword"]')
      .type(userObj.confirmPassword);
    })
    .then(function () {
      return self.remote.setFindTimeout(defaultFindTimeout).findById('fullname')
      .type(userObj.fullname);
    })
    .then(function () {
      return self.remote.setFindTimeout(defaultFindTimeout).findById('email')
      .type(userObj.email);
    })
    .then(function () {
      return PageObjects.common.sleep(4000);
    })
    .then(function () {

      function addRoles(role) {
        return role.reduce(function (promise, roleName) {
          return promise
          .then(function () {
            PageObjects.common.debug('Add role: ' + roleName);
            return self.selectRole(roleName);
          })
          .then(function () {
            return PageObjects.common.sleep(1000);
          });
        }, Promise.resolve());
      }
      return addRoles(userObj.roles);
    })
    .then(function () {
      return PageObjects.common.sleep(4000);
    })
    .then(function () {
      if (userObj.save === true) {
        return self.remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('button[ng-click="saveUser(user)"]')
        .click();
      } else {
        return self.remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('.btn-default')
        .click();
      }

    });
  }

  addRole(roleName, userObj) {
    const self = this;
    return this.clickNewRole()
    .then(function () {
      return PageObjects.common.sleep(4000);
    })
    .then(function () {
      PageObjects.common.debug('userObj.indices[0].names = ' + userObj.indices[0].names);
      return self.remote.setFindTimeout(defaultFindTimeout).findById('name')
      .type(roleName);
    })
    .then(function () {
      return self.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('[data-test-subj="indicesInput0"] .ui-select-search')
      .type(userObj.indices[0].names);
    })
    .then(function () {
      return self.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('span.ui-select-choices-row-inner > div[ng-bind-html="indexPattern"]')
      .click();
    })
    .then(function () {
      console.log('query = ' + userObj.indices[0].query);
      return self.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('textarea[data-test-subj="queryInput0"]')
     .type(userObj.indices[0].query);
    })
    .then(function () {

      function addPriv(priv) {

        return priv.reduce(function (promise, privName) {
          return promise
          .then(function () {
            return self.remote.setFindTimeout(defaultFindTimeout)
            .findByCssSelector('[data-test-subj="privilegesInput0"] .ui-select-search')
            .click();
          })
          .then(function () {
            console.log('priv item = ' + privName);
            self.remote.setFindTimeout(defaultFindTimeout)
            .findByCssSelector('[data-test-subj="privilegeOption-' + privName + '"]')
            .click();
          })
          .then(function () {
            return PageObjects.common.sleep(1000);
          });

        }, Promise.resolve());
      }
      return addPriv(userObj.indices[0].privileges);
    })
    //clicking save button
    .then(function () {
      console.log('click save button');
      self.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('[ng-click="saveRole(role)"]')
      .click();
    })

    .then(function () {
      return PageObjects.common.sleep(5000);
    });
  }
  selectRole(role) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('input[aria-label="Select box"]')
    .click()
    .type(role)
    .then(() => {
      this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('div[ng-bind-html="role"]')
      .click();
    });
  }

  deleteUser(username) {
    PageObjects.common.debug('Delete user ' + username);
    return this.clickLinkText(username)
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    })
    .then(() => {
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('.btn-danger')
      .click();
    })
    .then(() => {
      return this.remote.getAlertText();
    })
    .then((text) => {
      PageObjects.common.debug('acceptAlert test = ' + text);
      return this.remote.acceptAlert();
    });
  }

  getAdvancedSettings(propertyName) {
    PageObjects.common.debug('in setAdvancedSettings');
    return PageObjects.common.findTestSubject('advancedSetting&' + propertyName + ' currentValue')
    .getVisibleText();
  }

  setAdvancedSettings(propertyName, propertyValue) {
    const self = this;

    return PageObjects.common.findTestSubject('advancedSetting&' + propertyName + ' editButton')
    .click()
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    })
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    .then(function setAdvancedSettingsClickPropertyValue() {
      return self.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('option[label="' + propertyValue + '"]')
      .click();
    })
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    })
    .then(function setAdvancedSettingsClickSaveButton() {
      return PageObjects.common.findTestSubject('advancedSetting&' + propertyName + ' saveButton')
      .click();
    })
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  getAdvancedSettings(propertyName) {
    PageObjects.common.debug('in setAdvancedSettings');
    return PageObjects.common.findTestSubject('advancedSetting&' + propertyName + ' currentValue')
    .getVisibleText();
  }

  navigateTo() {
    // see server_config.js, this navs to management
    return PageObjects.common.navigateToApp('settings');
  }

  getTimeBasedEventsCheckbox() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('input[ng-model="index.isTimeBased"]');
  }

  getTimeBasedIndexPatternCheckbox(timeout) {
    timeout = timeout || defaultFindTimeout;
    // fail faster since we're sometimes checking that it doesn't exist
    return this.remote.setFindTimeout(timeout)
    .findByCssSelector('input[ng-model="index.nameIsPattern"]');
  }

  getIndexPatternField() {
    return PageObjects.common.findTestSubject('createIndexPatternNameInput');
  }


  async setIndexPatternField(indexPatternName = 'logstash-*') {
    // return await PageObjects.common.try(async () => {
      PageObjects.common.debug(`setIndexPatternField(${indexPatternName})`);
      const field = await this.getIndexPatternField();
      // await field.clearValue();
      // PageObjects.common.debug('setIndexPatternField we just cleared the value');
      if (indexPatternName.endsWith('*')) {
        if (indexPatternName.startsWith('*')) {
          // special case for *:makelogs-* https://github.com/elastic/kibana/issues/16691
          await field.type(indexPatternName);
        } else {
          // if we passed in an indexPaternName that ends in *, remove it because the UI is going to add it
          // The next 2 lines typed 1 char first, then the rest minus the * on the end
          // but maybe that's triggering the scrollTop error?
          PageObjects.common.debug('type first char');
          await field.type(indexPatternName.slice(0,1));
          await PageObjects.common.sleep(444);
          PageObjects.common.debug('type the rest');
          await field.type(indexPatternName.slice(1,-1));
          PageObjects.common.debug('setIndexPatternField we just set the value');
        }
      } else {
        // if we passed in an indexPatternName without *, remove the one the UI adds
        await field.session.pressKeys(indexPatternName.split(''));
        await field.session.pressKeys([Keys.ARROW_RIGHT]);
        await field.session.pressKeys([Keys.BACKSPACE]);
      }
      await PageObjects.header.getSpinnerDone();
      const currentName = await field.getAttribute('value');
      expect(currentName).to.eql(indexPatternName);
    // });
  }

  async getIndexPatternIdFromUrl() {
    const currentUrl = await this.remote.getCurrentUrl();
    const indexPatternId = currentUrl.match(/.*\/(.*)/)[1];
    PageObjects.common.debug('index pattern ID: ', indexPatternId);
    return indexPatternId;
  }

  getTimeFieldNameField() {
    return PageObjects.common.findTestSubject('createIndexPatternTimeFieldSelect');
  }

  selectTimeFieldOption(selection) {
    // open dropdown
    return this.getTimeFieldNameField().click()
    .then(() => {
      // close dropdown, keep focus
      return this.getTimeFieldNameField().click();
    })
    .then(() => {
      PageObjects.common.debug('select time field option = ' + selection);
      return PageObjects.common.try(() => {
        return this.getTimeFieldOption(selection).click()
        .then(() => {
          return this.getTimeFieldOption(selection).isSelected();
        })
        .then(selected => {
          if (!selected) throw new Error('option not selected: ' + selected);
        });
      });
    });
  }

  getTimeFieldOption(selection) {
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findDisplayedByCssSelector('option[value="' + selection + '"]').click();
  }

  getCreateButton() {
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findDisplayedByCssSelector('[type="submit"]');
  }

  clickDefaultIndexButton() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button[ng-if="setDefault"]').click()
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  clickDeletePattern() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button.btn.btn-danger.ng-scope').click();
  }

  getIndexPageHeading() {
    return PageObjects.common.findTestSubject('indexPatternTitle')
    .getVisibleText();
  }

  getConfigureHeader() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('h1');
  }
  getTableHeader() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('table.euiTable thead tr th');
  }

  sortBy(columnName) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('table.table.table-condensed thead tr th span')
    .then(function (chartTypes) {

      function getChartType(chart) {
        return chart.getVisibleText()
        .then(function (chartString) {
          if (chartString === columnName) {
            return chart.click()
            .then(function () {
              return PageObjects.header.getSpinnerDone();
            });
          }
        });
      }

      const getChartTypesPromises = chartTypes.map(getChartType);
      return Bluebird.all(getChartTypesPromises);
    });
  }

  getTableRow(rowNumber, colNumber) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    // passing in zero-based index, but adding 1 for css 1-based indexes
    .findByCssSelector('div.agg-table-paginated table.table.table-condensed tbody tr:nth-child(' +
      (rowNumber + 1) + ') td.ng-scope:nth-child(' +
      (colNumber + 1) + ') span.ng-binding'
    );
  }

  getFieldsTabCount() {
    const self = this;
    const selector = 'li.kbn-management-tab.active a small';

    return PageObjects.common.try(function () {
      return self.remote.setFindTimeout(defaultFindTimeout / 10)
      .findByCssSelector(selector).getVisibleText()
      .then(function (theText) {
        // the value has () around it, remove them
        return theText.replace(/\((.*)\)/, '$1');
      });
    });
  }

  getPageSize() {
    let selectedItemLabel = '';
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('select.ng-pristine.ng-valid.ng-untouched option')
    .then(function (chartTypes) {
      function getChartType(chart) {
        const thisChart = chart;
        return chart.isSelected()
        .then(function (isSelected) {
          if (isSelected === true) {
            return thisChart.getProperty('label')
            .then(function (theLabel) {
              selectedItemLabel = theLabel;
            });
          }
        });
      }

      const getChartTypesPromises = chartTypes.map(getChartType);
      return Bluebird.all(getChartTypesPromises);
    })
    .then(() => {
      return selectedItemLabel;
    });
  }

  getPageFieldCount() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('div.agg-table-paginated table.table.table-condensed tbody tr td.ng-scope:nth-child(1) span.ng-binding');
  }

  goToPage(pageNum) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('ul.pagination-other-pages-list.pagination-sm.ng-scope li.ng-scope:nth-child(' +
      (pageNum + 1) + ') a.ng-binding')
    .click()
    .then(function () {
      return PageObjects.header.getSpinnerDone();
    });
  }

  openControlsRow(row) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('table.table.table-condensed tbody tr:nth-child(' +
      (row + 1) + ') td.ng-scope div.actions a.btn.btn-xs.btn-default i.fa.fa-pencil')
    .click();
  }

  openControlsByName(name) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('div.actions a.btn.btn-xs.btn-default[href$="/' + name + '"]')
    .click();
  }

  increasePopularity() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button.btn.btn-default[aria-label="Plus"]')
    .click()
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  getPopularity() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('input[ng-model="editor.field.count"]')
    .then(input => {
      return input.getProperty('value');
    });
  }

  controlChangeCancel() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button.btn.btn-primary[aria-label="Cancel"]')
    .click()
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  controlChangeSave() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button.btn.btn-success.ng-binding[aria-label="Update Field"]')
    .click()
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  setPageSize(size) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('form.form-inline.pagination-size.ng-scope.ng-pristine.ng-valid div.form-group option[label="' + size + '"]')
    .click()
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  async clickKibanaIndices() {
    PageObjects.common.debug('clickKibanaIndices link');
    await this.clickLinkText('Index Patterns');
  }

  async getCreateIndexPatternGoToStep2Button() {
    return await PageObjects.common.findTestSubject('createIndexPatternGoToStep2Button');
  }

  async getCreateIndexPatternCreateButton() {
    return await PageObjects.common.findTestSubject('createIndexPatternButton');
  }

  async createIndexPattern(indexPatternName = 'logstash-*', timefield = '@timestamp') {
    await PageObjects.common.try(async () => {
      PageObjects.common.debug('navigateTo settings');
      await this.navigateTo();
      PageObjects.common.debug('clickKibanaIndices');
      await this.clickKibanaIndices();
      await PageObjects.common.sleep(9444);
      // PageObjects.common.saveScreenshot(`IndexPatternPage-${indexPatternName.replace('*','star')}`);
      await PageObjects.common.sleep(1444);
      PageObjects.common.debug('clickOptionalAddNewButton');
      await this.clickOptionalAddNewButton();
      PageObjects.common.debug('setIndexPatternField');
      await this.setIndexPatternField(indexPatternName);
      await PageObjects.common.sleep(4000);
      // PageObjects.common.saveScreenshot(`IndexPatternPageAfter-${indexPatternName.replace('*','star')}`);
      await (await this.getCreateIndexPatternGoToStep2Button()).click();
      await PageObjects.common.sleep(2002);
      if (timefield) {
        await this.selectTimeFieldOption(timefield);
      }
      await (await this.getCreateIndexPatternCreateButton()).click();
      await PageObjects.header.getSpinnerDone();
      const patternTitle = await PageObjects.common.findTestSubject('indexPatternTitle').getVisibleText();
      PageObjects.common.log(`Created index pattern ${patternTitle}`);
      expect(patternTitle).to.eql(indexPatternName);
    });
  }


  async clickOptionalAddNewButton() {
    try {
      // await this.remote.setFindTimeout(2000).findByCssSelector('em.fa-star[aria-label="Default index pattern"]');
      PageObjects.common.log('found default index pattern star so click add button');
      await PageObjects.common.findTestSubject('createIndexPatternButton').click();
      await PageObjects.common.sleep(4444);
      // PageObjects.common.saveScreenshot(`IndexPatternPageNew-${indexPatternName.replace('*','star')}`);
    } catch (err) {
      PageObjects.common.log('did not find star so there must not be a default index pattern');
    }
  }

  removeIndexPattern() {
    let alertText;

    return PageObjects.common.try(() => {
      PageObjects.common.debug('click delete index pattern button');
      return this.clickDeletePattern();
    })
    .then(() => {
      return PageObjects.common.try(() => {
        PageObjects.common.debug('getAlertText');
        return this.remote.getAlertText();
      });
    })
    .then(function (text) {
      alertText = text;
    })
    .then(() => {
      return PageObjects.common.try(() => {
        PageObjects.common.debug('acceptAlert');
        return this.remote.acceptAlert();
      });
    })
    .then(() => {
      return PageObjects.common.try(() => {
        return this.remote.getCurrentUrl()
        .then(function (currentUrl) {
          if (currentUrl.match(/indices\/.+\?/)) {
            throw new Error('Index pattern not removed');
          }
        });
      });
    })
    .then(() => {
      return alertText;
    });
  }

  getLatestReportingJob() {
    // note, 'tr' should get is the first data row (not the 'th' header row)
    // and the most recent job is always on top.
    const report = {};
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('tr > td:nth-child(1)')
    .getVisibleText()
    .then((col1) => {
      report.queryName = col1.split('\n')[0];
      report.type = col1.split('\n')[1];
    })
    .then(() => {
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('tr > td:nth-child(2)')
      .getVisibleText();
    })
    .then((col2) => {
      report.added = col2.split('\n')[0];
      report.username = col2.split('\n')[1];
    })
    .then(() => {
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('tr > td:nth-child(3)')
      .getVisibleText();
    })
    .then((col3) => {
      report.status = col3.split('\n')[0];
      report.completed = col3.split('\n')[1];
      return report;
    });
  }

  clickDownloadPdf() {
    // note, 'tr' should get is the first data row (not the 'th' header row)
    // and the most recent job is always on top.
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('tr > td.actions > button')
    .click();
  }

  getVersionInfo() {
     let version;
     return this.remote.setFindTimeout(defaultFindTimeout)
     .findByCssSelector('div.page-row-text').getVisibleText()
     .then((tmpVersion) => {
       version = tmpVersion;
       PageObjects.common.debug('Found version (' + version + ')');
       return PageObjects.common.navigateToApp('status_page');
     })
     .then(() => {
       return this.remote.setFindTimeout(defaultFindTimeout)
       .findDisplayedByCssSelector('div.euiPanel div.euiFlexGroup div:nth-child(2) div div:nth-child(2) p strong')
       .getVisibleText();
     })
     .then((commit) => {
       PageObjects.common.debug('Found commit (' + commit + ')');
       return { version: version, build: commit };
     });
   }

}
