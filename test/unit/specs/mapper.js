define(function (require) {
  var elasticsearch = require('../bower_components/elasticsearch/elasticsearch.js');
  var _ = require('lodash');
  var Courier = require('courier/courier');
  var DataSource = require('courier/data_source/data_source');
  var Mapper = require('courier/mapper');
  var client = new elasticsearch.Client({
    host: 'localhost:9200',
  });

  describe('Mapper Module', function () {

    it('provides a constructor for the Mapper class', function () {
      var mapper = new Mapper(client);
      expect(mapper).to.be.a(Mapper);
    });

    it('has a function called getFields that returns an object', function () {
      /*
      var courier = new Courier({
        client: client
      });

      var dataSource = courier.createSource('search')
        .index('_all')
        .size(5);

      var mapper = new Mapper(client);

      var callback = function(data) {
        console.log(data);
      };

      expect(mapper.getFields(dataSource,callback)).to.eql({
        foo: {
          type: 'string'
        },
        "foo.bar": {
          type: 'long'
        }
      });
      */
    });


  });

});