var root = require('requirefrom')('');
var schema = root('src/server/lib/config/schema');
var expect = require('expect.js');
var Joi = require('joi');
var package = root('./package.json');
var path = require('path');

describe('lib/config/schema', function () {

  describe('defaults', function () {

    it('should resolve the package.json', function () {
      var results = Joi.validate({}, schema);
      expect(results.value.kibana.package).to.eql(package);
    });

    it('should resolve the publicFolder', function () {
      var results = Joi.validate({}, schema);
      var publicFolder = path.resolve(__dirname, '..', '..', '..', '..', '..', 'src', 'kibana');
      expect(results.value.kibana.publicFolder).to.eql(publicFolder);
    });

  });

});


