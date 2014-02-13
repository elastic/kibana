define(function (require) {
  var elasticsearch = require('elasticsearch');
  var _ = require('lodash');
  var Mapper = require('courier/mapper');

  var client = new elasticsearch.Client({
    host: 'localhost:9200',
  });

  describe('Mapper Module', function () {

    it('provides a constructor for the Mapper class', function () {
      var mapper = new Mapper(client);
      expect(mapper).to.be.a(Mapper);
    });

    it('has a function call getFields that returns an empty object', function () {
      var mapper = new Mapper(new Courier());
      expect(mapper.getFields()).to.eql({
        foo: {
          type: 'string'
        },
        "foo.bar": {
          type: 'long'
        }
      });
    });


  });

});