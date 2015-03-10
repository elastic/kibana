define(function (require) {
  var angular = require('angular');

  // Load the kibana app dependencies.
  require('angular-route');

  // Load kibana and its applications
  require('plugins/discover/index');

  var filter;

  var init = function (expandable) {
    // Load the application
    module('kibana');

    // Create the scope
    inject(function ($filter) {
      filter = $filter('prettyJson');
    });
  };

  describe('prettyJson filter', function () {
    var testInput = {
      test1: null,
      test2: 'value1',
      test3: 1,
      test4: true,
      test5: { test6: 'value2' },
      test6: [ 'value3' ]
    };

    var testOutput = '{\n  <span class="key">"test1":</span> <span class="null">null</span>,\n  <span class="key">"test2":</span> ' +
                     '<span class="string">"value1"</span>,\n  <span class="key">"test3":</span> <span class="number">1</span>,\n  ' +
                     '<span class="key">"test4":</span> <span class="boolean">true</span>,\n  <span class="key">"test5":</span> {\n    ' +
                     '<span class="key">"test6":</span> <span class="string">"value2"</span>\n  },\n  <span class="key">"test6":</span> ' +
                     '[\n    <span class="string">"value3"</span>\n  ]\n}';

    beforeEach(function () {
      init();
    });

    describe('prettyJson', function () {
      it('should have the filter', function () {
        expect(filter).to.not.be(null);
      });

      it('should prettyfy json', function () {
        expect(filter(testInput)).to.be(testOutput);
      });
    });
  });
});
