define(function (require) {
  describe('config component', function () {
    var $scope;
    var config;
    var defaults;
    var configFile;

    beforeEach(module('kibana'));
    beforeEach(inject(function ($injector, Private) {
      config = $injector.get('config');
      $scope = $injector.get('$rootScope');
      configFile = $injector.get('configFile');
      defaults = Private(require('components/config/defaults'));
    }));

    it('exposes the configFile', function () {
      expect(config.file).to.be(configFile);
    });

    describe('#get', function () {

      it('gives access to config values', function () {
        expect(config.get('dateFormat')).to.be.a('string');
      });

      it('reads from the defaults', function () {
        var initial = config.get('dateFormat');
        var newDefault = initial + '- new';
        defaults.dateFormat.value = newDefault;
        expect(config.get('dateFormat')).to.be(newDefault);
      });

    });

    describe('#set', function () {

      it('stores a value in the config val set', function () {
        var initial = config.get('dateFormat');
        config.set('dateFormat', 'notaformat');
        expect(config.get('dateFormat')).to.be('notaformat');
      });

    });

    describe('#$bind', function () {

      it('binds a config key to a $scope property', function () {
        var dateFormat = config.get('dateFormat');
        config.$bind($scope, 'dateFormat');
        expect($scope).to.have.property('dateFormat', dateFormat);
      });

      it('alows overriding the property name', function () {
        var dateFormat = config.get('dateFormat');
        config.$bind($scope, 'dateFormat', 'defaultDateFormat');
        expect($scope).to.not.have.property('dateFormat');
        expect($scope).to.have.property('defaultDateFormat', dateFormat);
      });

      it('keeps the property up to date', function () {
        var dateFormat = config.get('dateFormat');
        var newDateFormat = dateFormat + ' NEW NEW NEW!';
        config.$bind($scope, 'dateFormat');

        expect($scope).to.have.property('dateFormat', dateFormat);
        config.set('dateFormat', newDateFormat);
        expect($scope).to.have.property('dateFormat', newDateFormat);

      });

    });

  });
});
