// https://github.com/elastic/kibana-qa/blob/master/settings.md

define(function (require) {

  var registerSuite = require('intern!object');
  var expect = require('intern/dojo/node!expect.js');
  //var ScenarioManager = require('intern/dojo/node!../fixtures/scenarioManager');
  var fs = require('intern/dojo/node!fs');
  var pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');
  var Common = require('../support/pages/Common');
  var SettingsPage = require('../support/pages/SettingsPage');
  var HeaderPage = require('../support/pages/HeaderPage');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');


  registerSuite(function () {
    var common;
    var settingsPage;
    var headerPage;
    var scenarioManager;

    var expectedAlertText = 'Are you sure you want to remove this index pattern?';
    return {
      // on setup, we create an settingsPage instance
      // that we will use for all the tests
      setup: function () {
        // curl -XDELETE http://localhost:9200/.kibana

        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
        headerPage = new HeaderPage(this.remote);
        scenarioManager = new ScenarioManager(url.format(config.elasticsearch));

      },

      beforeEach: function () {
        // start each test with an empty kibana index
        return common
          .sleep(1000)
          .then(function () {
            return scenarioManager
              .unload('emptyKibana');
          })
          .then(function () {
            return common
              .sleep(2000);
          })
          .then(function () {
            return scenarioManager
              .load('emptyKibana');
          })
          .then(function () {
            return scenarioManager
              .loadIfEmpty('logstash');
          })
          .then(function () {
            return common
              .sleep(2000);
          });
      },

      teardown: function () {
        return scenarioManager
          .unload('logstash');
      },

      /*
       ** Test the default state of checboxes and the 2 text input fields
       */
      'testSettingsInitialState': function () {
        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function () {
            return settingsPage
              .getTimeBasedEventsCheckbox()
              .isSelected()
              .then(function (selected) {
                expect(selected).to.be.ok();
              });
          })
          .then(function () {
            return settingsPage
              .getNameIsPatternCheckbox()
              .isSelected()
              .then(function (nameIsPatternSelected) {
                expect(nameIsPatternSelected).to.not.be.ok();
              });
          })
          .then(function () {
            return settingsPage
              .getIndexPatternField()
              .then(function (patternField) {
                return patternField
                  .getProperty('value')
                  .then(function (pattern) {
                    common.log('patternField value = ' + pattern);
                    expect(pattern).to.be('logstash-*');
                  });
              });
          })
          .then(function () {
            return settingsPage.getTimeFieldNameField()
              .isSelected()
              .then(function (timeFieldIsSelected) {
                common.log('timeField isSelected = ' + timeFieldIsSelected);
                expect(timeFieldIsSelected).to.not.be.ok();
              });

          });
      },

      /*
       ** Ensure Create button is disabled until you select a time field
       */
      'testCreateButtonDisabledUntilTimeFieldSelected': function () {
        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function () {
            return settingsPage
              .getCreateButton()
              .isEnabled()
              .then(function (enabled) {
                expect(enabled).to.not.be.ok();
              });
          })
          .then(function () {
            // select a time field and check that Create button is enabled
            return settingsPage
              .selectTimeFieldOption('@timestamp');
          })
          .then(function () {
            return settingsPage
              .getCreateButton()
              .isEnabled()
              .then(function (enabled) {
                expect(enabled).to.be.ok();
              });
          });
      },


      /*
       ** Test that unchecking the Time-based Events checkbox hides the Name is pattern checkbox
       */
      'testSettingsCheckboxHide': function () {
        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function () {
            return settingsPage
              .getTimeBasedEventsCheckbox()
              .then(function (selected) {
                // uncheck the 'time-based events' checkbox
                return selected.click();
              });
          })
          // try to find the name is pattern checkbox (shouldn't find it)
          .then(function () {
            return settingsPage.getNameIsPatternCheckbox();
          })
          .then(function (selected1) {
            expect(
              true, false, 'Did not expect to find the Name is Pattern checkbox when the TimeBasedEvents checkbox is unchecked'
            );
          })
          .catch(function (reason) {
            // it's OK.  We expected not to find the getNameIsPatternCheckbox.
            return;
          });
      },
      // Index pattern field list

      'testCreateRemoveIndexPattern': function () {
        var self = this.remote;
        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function () {
            // select a time field and then Create button
            return settingsPage
              .selectTimeFieldOption('@timestamp');
          })
          .then(function () {
            return settingsPage
              .getCreateButton()
              .click();
          })
          .then(function () {
            return settingsPage
              .getIndexPageHeading()
              .then(function (getIndexPageHeading) {
                common.log(getIndexPageHeading.getVisibleText());
              })
              .then(function () {
                // delete the index pattern
                return settingsPage
                  .clickDeletePattern();
              })
              .then(function () {
                return common.tryForTime(3000, function () {
                  return self
                    .getAlertText();
                });
              })
              .then(function () {
                return self
                  .acceptAlert();
              })
              // getting the current URL which shows 'logstash-*' pattern
              .then(function () {
                return self
                  .getCurrentUrl()
                  .then(function (currentUrl) {
                    common.log('currentUrl = ' + currentUrl);
                  });
              })
              // pollUntil we find the Create button
              .then(pollUntil(function (value) {
                var element = document.getElementsByClassName('btn-success')[0];
                return element ? element : null;
              }, ['Configure an index pattern'], 8000))
              .then(function () {
                console.log('success');
              })
              // getting the current URL which no longer includes 'logstash-*'
              .then(function () {
                return self
                  .getCurrentUrl()
                  .then(function (currentUrl) {
                    common.log('currentUrl = ' + currentUrl);
                  });
              });
          });
      },

      'testIndexPatternResultsHeader': function () {
        var self = this.remote;
        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function () {
            // select a time field and then Create button
            return settingsPage
              .selectTimeFieldOption('@timestamp');
          })
          .then(function () {
            return settingsPage
              .getCreateButton()
              .click();
          })
          .then(function () {
            return settingsPage
              .getIndexPageHeading()
              .then(function (getIndexPageHeading) {
                return getIndexPageHeading
                  .getVisibleText()
                  .then(function (pageText) {
                    expect(pageText).to.be('logstash-*');
                    // return
                  });
              });
          })
          .then(function () {
            return settingsPage
              .getTableHeader()
              .then(function (header) {
                common.log('header.length = ' + header.length); // 6 name   type  format  analyzed  indexed   controls
                expect(header.length).to.be(6);
                return header[0]
                  .getVisibleText()
                  .then(function (text) {
                    common.log('header[0] = ' + text); // name
                    expect(text).to.be('name');
                    return header;
                  });
              })
              .then(function (header) {
                return header[1]
                  .getVisibleText()
                  .then(function (text) {
                    common.log('header[1] = ' + text);
                    expect(text).to.be('type');
                    return header;
                  });
              })
              .then(function (header) {
                return header[2]
                  .getVisibleText()
                  .then(function (text) {
                    common.log('header[2] = ' + text);
                    expect(text).to.be('format');
                    return header;
                  });
              })
              .then(function (header) {
                return header[3]
                  .getVisibleText()
                  .then(function (text) {
                    common.log('header[3] = ' + text);
                    expect(text).to.be('analyzed');
                    return header;
                  });
              })
              .then(function (header) {
                return header[4]
                  .getVisibleText()
                  .then(function (text) {
                    common.log('header[4] = ' + text);
                    expect(text).to.be('indexed');
                    return header;
                  });
              })
              .then(function (header) {
                return header[5]
                  .getVisibleText()
                  .then(function (text) {
                    common.log('header[5] = ' + text);
                    expect(text).to.be('controls');
                    return header;
                  });
              })
              .then(function () {
                // delete the index pattern -X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X
                return settingsPage
                  .clickDeletePattern();
              })
              .then(function () {
                return common.tryForTime(3000, function () {
                  return self
                    .getAlertText();
                });
              })
              .then(function () {
                return self
                  .getAlertText()
                  .then(function (alertText) {
                    common.log('alertText = ' + alertText);
                    expect(alertText).to.be(expectedAlertText);
                  });
              })
              .then(function () {
                return self
                  .acceptAlert();
              });
          });
      },


      'testIndexPatternResultsSort': function () {
        var self = this.remote;
        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function () {
            // select a time field and then Create button
            return settingsPage
              .selectTimeFieldOption('@timestamp');
          })
          .then(function () {
            return settingsPage
              .getCreateButton()
              .click();
          })
          // check the page header to make sure we see logstash-*
          .then(function () {
            return settingsPage
              .getIndexPageHeading()
              .then(function (getIndexPageHeading) {
                return getIndexPageHeading
                  .getVisibleText()
                  .then(function (pageText) {
                    expect(pageText).to.be('logstash-*');
                    // return
                  });
              });
          })
          // Sort by Name
          .then(function sortByName() {
            return settingsPage
              .sortBy('name');
          })
          // check name sort
          .then(function sortAgain() {
            return settingsPage
              .getTableRow(0, 0)
              .then(function (row) {
                return row
                  .getVisibleText()
                  .then(function (rowText) {
                    //common.log('After name-sort first row first column = ' + rowText);
                    expect(rowText).to.be('@message');
                  });
              });
          })
          // Sort by Name again
          .then(function sortByName2() {
            return settingsPage
              .sortBy('name');
          })
          // check name sort
          .then(function sortAgain2() {
            return settingsPage
              .getTableRow(0, 0)
              .then(function (row) {
                return row
                  .getVisibleText()
                  .then(function (rowText) {
                    //common.log('After name-sort first row first column = ' + rowText);
                    expect(rowText).to.be('xss.raw');
                  });
              });
          })
          // Sort by type
          .then(function sortByType() {
            return settingsPage
              .sortBy('type');
          })
          // check type sort
          .then(function checksort() {
            return settingsPage
              .getTableRow(0, 1)
              .then(function (row) {
                return row
                  .getVisibleText()
                  .then(function (rowText) {
                    //common.log('After type-sort first row first column = ' + rowText);
                    expect(rowText).to.be('_source');
                  });
              });
          })
          // Sort by type again
          .then(function sortByType2() {
            return settingsPage
              .sortBy('type');
          })
          // check type sort
          .then(function checksort2() {
            return settingsPage
              .getTableRow(0, 1)
              .then(function (row) {
                return row
                  .getVisibleText()
                  .then(function (rowText) {
                    common.log('After type-sort first row first column = ' + rowText);
                    expect(rowText).to.be('string');
                  });
              });
          })
          // Sort by type again (this time it "unsorts it")
          .then(function sortByType2() {
            return settingsPage
              .sortBy('type');
          })
          // check pagination
          .then(function getFieldsTabCount() {
            return settingsPage
              .getFieldsTabCount()
              .then(function (tabCount) {
                common.log('fields item count = ' + tabCount);
                expect(tabCount).to.be('85');
              });
          })
          // verify the page size is 25
          .then(function checkPageSize() {
            return settingsPage
              .getPageSize()
              .then(function (pageSize) {
                expect(pageSize).to.be('25');
              });
          })
          // we know with 25 fields per page and 85 fields there should be 4 pages.
          // the first page should have 25 items on it.
          .then(function getPageFieldCount() {
            return settingsPage
              .getPageFieldCount()
              .then(function (pageCount) {
                common.log('Page 1 count = ' + pageCount.length);
                expect(pageCount.length).to.be(25);
              });
          })
          //page 2 should also have 25 items
          .then(function goPage2() {
            return settingsPage
              .goToPage(2);
          })
          .then(function getPageFieldCount() {
            return settingsPage
              .getPageFieldCount()
              .then(function (pageCount) {
                common.log('Page 2 count = ' + pageCount.length);
                expect(pageCount.length).to.be(25);
              });
          })
          //page 3 should also have 25 items
          .then(function goPage3() {
            return settingsPage
              .goToPage(3);
          })
          .then(function getPageFieldCount() {
            return settingsPage
              .getPageFieldCount()
              .then(function (pageCount) {
                common.log('Page 3 count = ' + pageCount.length);
                expect(pageCount.length).to.be(25);
              });
          })
          //page 4 should also have 10 items
          .then(function goPage4() {
            return settingsPage
              .goToPage(4);
          })
          .then(function getPageFieldCount() {
            return settingsPage
              .getPageFieldCount()
              .then(function (pageCount) {
                common.log('Page 4 count = ' + pageCount.length);
                expect(pageCount.length).to.be(10);
              });
          })
          .then(function () {
            // delete the index pattern -X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X
            return settingsPage
              .clickDeletePattern();
          })
          .then(function () {
            return common.tryForTime(3000, function () {
              return self
                .getAlertText();
            });
          })
          .then(function () {
            return self
              .getAlertText()
              .then(function (alertText) {
                common.log('alertText = ' + alertText);
                expect(alertText).to.be(expectedAlertText);
              });
          })
          .then(function () {
            return self
              .acceptAlert();
          });
      },


      'testIndexPatternPopularity': function () {
        var self = this.remote;
        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function () {
            // select a time field and then Create button
            return settingsPage
              .selectTimeFieldOption('@timestamp');
          })
          .then(function () {
            return settingsPage
              .getCreateButton()
              .click();
          })
          // check the page header to make sure we see logstash-*
          .then(function () {
            return settingsPage
              .getIndexPageHeading()
              .then(function (getIndexPageHeading) {
                return getIndexPageHeading
                  .getVisibleText()
                  .then(function (pageText) {
                    expect(pageText).to.be('logstash-*');
                    // return
                  });
              });
          })
          .then(function () {
            return settingsPage
              .setPageSize('All');
          })
          // increase Popularity
          .then(function openControlsByName() {
            return settingsPage
              .openControlsByName('geo.coordinates');
          })
          .then(function increasePopularity() {
            return settingsPage
              .increasePopularity();
          })
          .then(function getPopularity() {
            return settingsPage
              .getPopularity()
              .then(function (popularity) {
                common.log('popularity = ' + popularity);
                expect(popularity).to.be('1');
              });
          })
          // Cancel saving the popularity change
          .then(function controlChangeCancel() {
            return settingsPage
              .controlChangeCancel();
          })
          // set the page size to All again, https://github.com/elastic/kibana/issues/5030
          .then(function () {
            return settingsPage
              .setPageSize('All');
          })
          .then(function openControlsByName() {
            return settingsPage
              .openControlsByName('geo.coordinates');
          })
          // check that its 0 (previous increase was cancelled)
          .then(function getPopularity() {
            return settingsPage
              .getPopularity()
              .then(function (popularity) {
                common.log('popularity = ' + popularity);
                expect(popularity).to.be('0');
              });
          })
          .then(function increasePopularity() {
            return settingsPage
              .increasePopularity();
          })
          // Saving the popularity change
          .then(function controlChangeSave() {
            return settingsPage
              .controlChangeSave();
          })
          // set the page size to All again, https://github.com/elastic/kibana/issues/5030
          .then(function () {
            return settingsPage
              .setPageSize('All');
          })
          // open it again to see that it saved
          .then(function openControlsByName() {
            return settingsPage
              .openControlsByName('geo.coordinates');
          })
          // check that its 0 (previous increase was cancelled)
          .then(function getPopularity() {
            return settingsPage
              .getPopularity()
              .then(function (popularity) {
                common.log('popularity = ' + popularity);
                expect(popularity).to.be('1');
              });
          })
          // Cancel saving the popularity change (we didn't make a change in this case, just checking the value)
          .then(function controlChangeCancel() {
            return settingsPage
              .controlChangeCancel();
          })

        // should this test go to discover page and verify the Popular field?
        // ul.list-unstyled.sidebar-well.discover-popular-fields.hidden-sm.hidden-xs li.sidebar-item.ng-scope div.sidebar-item-title
        // field-name.ng-isolate-scope


        // delete the index pattern -X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X
        .then(function () {
            return settingsPage
              .clickDeletePattern();
          })
          .then(function () {
            return common.tryForTime(3000, function () {
              return self
                .getAlertText();
            });
          })
          .then(function () {
            return self
              .getAlertText()
              .then(function (alertText) {
                common.log('alertText = ' + alertText);
                expect(alertText).to.be(expectedAlertText);
              });
          })
          .then(function () {
            return self
              .acceptAlert();
          });
      }


    };
  });
});
