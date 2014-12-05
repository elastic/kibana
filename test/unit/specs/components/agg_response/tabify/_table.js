define(function (require) {
  return ['Table class', function () {
    var _ = require('lodash');

    var Table;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector) {
      Table = Private(require('components/agg_response/tabify/_table'));
    }));

    it('exposes rows array, but not the columns', function () {
      var table = new Table();
      expect(table.rows).to.be.an('array');
      expect(table.columns == null).to.be.ok();
    });

    describe('#aggConfig', function () {
      it('accepts a column from the table and returns its agg config', function () {
        var table = new Table();
        var football = {};
        var column = {
          aggConfig: football
        };

        expect(table.aggConfig(column)).to.be(football);
      });

      it('throws a TypeError if the column is malformed', function () {
        expect(function () {
          var notAColumn = {};
          (new Table()).aggConfig(notAColumn);
        }).to.throwException(TypeError);
      });
    });

    describe('#title', function () {
      it('returns nothing if the table is not part of a table group', function () {
        var table = new Table();
        expect(table.title()).to.be('');
      });

      it('returns the title of the TableGroup if the table is part of one', function () {
        var table = new Table();
        table.$parent = {
          title: 'TableGroup Title',
          tables: [table]
        };

        expect(table.title()).to.be('TableGroup Title');
      });
    });

    describe('#field', function () {
      it('calls the columns aggConfig#field() method', function () {
        var table = new Table();
        var football = {};
        var column = {
          aggConfig: {
            field: _.constant(football)
          }
        };

        expect(table.field(column)).to.be(football);
      });
    });

    describe('#fieldFormatter', function () {
      it('calls the columns aggConfig#fieldFormatter() method', function () {
        var table = new Table();
        var football = {};
        var column = {
          aggConfig: {
            fieldFormatter: _.constant(football)
          }
        };

        expect(table.fieldFormatter(column)).to.be(football);
      });
    });
  }];
});