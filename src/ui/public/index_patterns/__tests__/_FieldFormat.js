describe('FieldFormat class', function () {
  var _ = require('lodash');
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  var FieldFormat;
  var TestFormat;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    FieldFormat = Private(require('ui/index_patterns/_field_format/FieldFormat'));

    TestFormat = function (params) {
      TestFormat.Super.call(this, params);
    };

    TestFormat.id = 'test-format';
    TestFormat.title = 'Test Format';
    TestFormat.prototype._convert = _.asPrettyString;

    _.class(TestFormat).inherits(FieldFormat);
  }));

  describe('params', function () {
    it('accepts its params via the constructor', function () {
      var f = new TestFormat({ foo: 'bar' });
      expect(f.param('foo')).to.be('bar');
    });

    it('allows reading a clone of the params', function () {
      var params = { foo: 'bar' };
      var f = new TestFormat(params);
      var output = f.params();
      expect(output).to.eql(params);
      expect(output).to.not.be(params);
    });
  });

  describe('type', function () {
    it('links the constructor class to instances as the `type`', function () {
      var f = new TestFormat();
      expect(f.type).to.be(TestFormat);
    });
  });

  describe('toJSON', function () {
    it('serializes to a version a basic id and param pair', function () {
      var f = new TestFormat({ foo: 'bar' });
      var ser = JSON.parse(JSON.stringify(f));
      expect(ser).to.eql({ id: 'test-format', params: { foo: 'bar' } });
    });

    it('removes param values that match the defaults', function () {
      TestFormat.paramDefaults = { foo: 'bar' };

      var f = new TestFormat({ foo: 'bar', baz: 'bar' });
      var ser = JSON.parse(JSON.stringify(f));
      expect(ser.params).to.eql({ baz: 'bar' });
    });

    it('removes the params entirely if they are empty', function () {
      var f = new TestFormat();
      var ser = JSON.parse(JSON.stringify(f));
      expect(ser).to.not.have.property('params');
    });
  });

  describe('converters', function () {
    describe('#getConverterFor', function () {
      it('returns a converter for a specific content type', function () {
        var f = new TestFormat();
        expect(f.getConverterFor('html')()).to.be.a('string');
        expect(f.getConverterFor('text')()).to.be.a('string');
      });
    });

    describe('#_convert, the instance method or methods used to format values', function () {
      it('can be a function, which gets converted to a text and html converter', function () {
        TestFormat.prototype._convert = function () {
          return 'formatted';
        };

        var f = new TestFormat();
        var text = f.getConverterFor('text');
        var html = f.getConverterFor('html');
        expect(text).to.not.be(html);
        expect(text()).to.be('formatted');
        expect(html()).to.be('formatted');
      });

      it('can be an object, with seperate text and html converter', function () {
        TestFormat.prototype._convert = {
          text: _.constant('formatted text'),
          html: _.constant('formatted html'),
        };

        var f = new TestFormat();
        var text = f.getConverterFor('text');
        var html = f.getConverterFor('html');
        expect(text).to.not.be(html);
        expect(text()).to.be('formatted text');
        expect(html()).to.be('formatted html');
      });

      it('does not escape the output of the text converter', function () {
        TestFormat.prototype._convert = _.constant('<script>alert("xxs");</script>');
        var f = new TestFormat();
        expect(f.convert('', 'text')).to.contain('<');
      });

      it('does escape the output of the text converter if used in an html context', function () {
        TestFormat.prototype._convert = _.constant('<script>alert("xxs");</script>');
        var f = new TestFormat();
        expect(f.convert('', 'html')).to.not.contain('<');
      });

      it('does not escape the output of an html specific converter', function () {
        TestFormat.prototype._convert = {
          text: _.constant('<img>'),
          html: _.constant('<img>'),
        };

        var f = new TestFormat();
        expect(f.convert('', 'text')).to.be('<img>');
        expect(f.convert('', 'html')).to.be('<img>');
      });
    });

    describe('#convert', function () {
      it('formats a value, defaulting to text content type', function () {
        TestFormat.prototype._convert = {
          text: _.constant('text'),
          html: _.constant('html'),
        };

        var f = new TestFormat();
        expect(f.convert('val')).to.be('text');
      });

      it('formats a value as html, when specified via second param', function () {
        TestFormat.prototype._convert = {
          text: _.constant('text'),
          html: _.constant('html'),
        };

        var f = new TestFormat();
        expect(f.convert('val', 'html')).to.be('html');
      });
    });

  });
});
