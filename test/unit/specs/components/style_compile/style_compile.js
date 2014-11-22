define(function (require) {
  describe('styleCompile directive', function () {
    var $ = require('jquery');

    var config;
    var $rootScope;

    beforeEach(module('kibana'));
    beforeEach(inject(function ($injector) {
      config = $injector.get('config');
      $rootScope = $injector.get('$rootScope');
    }));

    it('exports a few config values as css', function () {
      var $style = $('#style-compile');

      config.set('truncate:maxHeight', 0);
      $rootScope.$apply();
      expect($style.html().trim()).to.be([
        '.truncate-by-height {',
        '  max-height: none;',
        '}',
        '.truncate-by-height::before {',
        '  top: -15px;',
        '}'
      ].join('\n'));

      config.set('truncate:maxHeight', 15);
      $rootScope.$apply();
      expect($style.html().trim()).to.be([
        '.truncate-by-height {',
        '  max-height: 15px !important;',
        '}',
        '.truncate-by-height::before {',
        '  top: 0px;',
        '}'
      ].join('\n'));
    });
  });
});