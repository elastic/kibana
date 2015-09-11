// Kibana is loading. Give me a moment here. I'm loading a whole bunch of code. Don't worry, all this good stuff will be cached up for next time!
//http://localhost:5601/app/kibana#/settings/indices/?_g=%28refreshInterval:%28display:Off,pause:!f,value:0%29,time:%28from:now-15m,mode:quick,to:now%29%29
//http://localhost:5601/app/kibana#/settings/indices/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))
// long timeout if ElasticSearch isn't running...

// we need to create a default index to be able to navigate around.

define([
  'intern!object',
  'intern/chai!assert',
  'intern/dojo/node!fs',
  '../support/pages/SettingsPage',
  '../support/pages/HeaderPage',
  '../support/pages/DiscoverPage'

], function (registerSuite, assert, fs, SettingsPage, HeaderPage, DiscoverPage) {

  registerSuite(function () {
    var settingsPage;
    var headerPage;
    var discoverPage;
    var url = 'http://localhost:5601';
    var fromTime = '2015-09-03 06:31:44.000';
    var toTime = '2015-09-03 18:31:44.000';
    // time range in top right uses 'to'
    // time range above chart uses '-'
    var timeRange = 'September 3rd 2015, 06:31:44.000 to September 3rd 2015, 18:31:44.000';
    var queryName1 = 'Query # 1';

    return {
      // on setup, we create an headerPage instance
      // that we will use for all the tests
      setup: function () {
        // curl -XDELETE http://localhost:9200/.kibana
        settingsPage = new SettingsPage(this.remote);
        headerPage = new HeaderPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
      },

      'testSavingQuery': function () {
        var remote = this.remote;
        return this.remote
          .get(url)
          .then(function () {
            return remote
              .setWindowSize(1600, 1024);
          })
          .then(function () {
            console.log('Select Time Field Option @timestamp');
            return settingsPage
              .selectTimeFieldOption('@timestamp');
          })
          .then(function () {
            console.log('Click Create button');
            return settingsPage
              .clickCreateButton();
          })
          .then(function () {
            console.log('Click Default Index button');
            return settingsPage
              .clickDefaultIndexButton();
          })
          .then(function () {
            console.log('Click Discover Tab');
            return headerPage
              .clickDiscover();
          })
          .then(function () {
            console.log('Click time picker');
            return discoverPage
              .clickTimepicker();
          })
          .then(function () {
            console.log('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
            return discoverPage
              .setAbsoluteRange(fromTime, toTime);
          })
          .then(function () {
            console.log('Collapse Time Picker pane');
            return discoverPage
              .collapseTimepicker();
          })
          .then(function () {
            console.log('Get the timestamp to verify');
            return discoverPage
              .getTimespanText();
          })
          .then(function (actualTimeString) {
            console.log('actualTimeString = \"' + actualTimeString + '\"');
            assert.strictEqual(actualTimeString,
              timeRange,
              'Expected our absolute time range. '
            );
          })
          .then(function () {
            console.log('Save Search as \"' + queryName1 + '\"');
            return discoverPage
              .saveSearch(queryName1);
          })
          .then(function () {
            console.log('Get and verify the query name in upper-right corner of chart');
            return discoverPage
              .getCurrentQueryName()
              .then(function (actualQueryNameString) {
                assert.strictEqual(actualQueryNameString, queryName1, 'Expected to find our saved query name');
              });
          });
      }
    };
  });
});
