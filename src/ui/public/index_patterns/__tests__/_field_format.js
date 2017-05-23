import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { IndexPatternsFieldFormatProvider } from 'ui/index_patterns/_field_format/field_format';

describe('FieldFormat class', function () {

  let FieldFormat;
  let TestFormat;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    FieldFormat = Private(IndexPatternsFieldFormatProvider);

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
      const f = new TestFormat({ foo: 'bar' });
      expect(f.param('foo')).to.be('bar');
    });

    it('allows reading a clone of the params', function () {
      const params = { foo: 'bar' };
      const f = new TestFormat(params);
      const output = f.params();
      expect(output).to.eql(params);
      expect(output).to.not.be(params);
    });
  });

  describe('type', function () {
    it('links the constructor class to instances as the `type`', function () {
      const f = new TestFormat();
      expect(f.type).to.be(TestFormat);
    });
  });

  describe('toJSON', function () {
    it('serializes to a version a basic id and param pair', function () {
      const f = new TestFormat({ foo: 'bar' });
      const ser = JSON.parse(JSON.stringify(f));
      expect(ser).to.eql({ id: 'test-format', params: { foo: 'bar' } });
    });

    it('removes param values that match the defaults', function () {
      TestFormat.paramDefaults = { foo: 'bar' };

      const f = new TestFormat({ foo: 'bar', baz: 'bar' });
      const ser = JSON.parse(JSON.stringify(f));
      expect(ser.params).to.eql({ baz: 'bar' });
    });

    it('removes the params entirely if they are empty', function () {
      const f = new TestFormat();
      const ser = JSON.parse(JSON.stringify(f));
      expect(ser).to.not.have.property('params');
    });
  });

  describe('converters', function () {
    describe('#getConverterFor', function () {
      it('returns a converter for a specific content type', function () {
        const f = new TestFormat();
        expect(f.getConverterFor('html')()).to.be.a('string');
        expect(f.getConverterFor('text')()).to.be.a('string');
      });
    });

    describe('#_convert, the instance method or methods used to format values', function () {
      it('can be a function, which gets converted to a text and html converter', function () {
        TestFormat.prototype._convert = function () {
          return 'formatted';
        };

        const f = new TestFormat();
        const text = f.getConverterFor('text');
        const html = f.getConverterFor('html');
        expect(text).to.not.be(html);
        expect(text('formatted')).to.be('formatted');
        expect(html('formatted')).to.be('<span ng-non-bindable>formatted</span>');
      });

      it('can be an object, with seperate text and html converter', function () {
        TestFormat.prototype._convert = {
          text: _.constant('formatted text'),
          html: _.constant('formatted html'),
        };

        const f = new TestFormat();
        const text = f.getConverterFor('text');
        const html = f.getConverterFor('html');
        expect(text).to.not.be(html);
        expect(text('formatted text')).to.be('formatted text');
        expect(html('formatted html')).to.be('<span ng-non-bindable>formatted html</span>');
      });

      it('does not escape the output of the text converter', function () {
        TestFormat.prototype._convert = _.constant('<script>alert("xxs");</script>');
        const f = new TestFormat();
        expect(f.convert('', 'text')).to.contain('<');
      });

      it('does escape the output of the text converter if used in an html context', function () {
        TestFormat.prototype._convert = _.constant('<script>alert("xxs");</script>');
        const f = new TestFormat();
        expect(_.trimRight(_.trimLeft(f.convert('', 'html'), '<span ng-non-bindable>'), '</span>'))
          .to.not.contain('<');
      });

      it('does not escape the output of an html specific converter', function () {
        TestFormat.prototype._convert = {
          text: _.constant('<img>'),
          html: _.constant('<img>'),
        };

        const f = new TestFormat();
        expect(f.convert('', 'text')).to.be('<img>');
        expect(f.convert('', 'html')).to.be('<span ng-non-bindable><img></span>');
      });
    });

    describe('#convert', function () {
      it('formats a value, defaulting to text content type', function () {
        TestFormat.prototype._convert = {
          text: _.constant('text'),
          html: _.constant('html'),
        };

        const f = new TestFormat();
        expect(f.convert('val')).to.be('text');
      });

      it('formats a value as html, when specified via second param', function () {
        TestFormat.prototype._convert = {
          text: _.constant('text'),
          html: _.constant('html'),
        };

        const f = new TestFormat();
        expect(f.convert('val', 'html')).to.be('<span ng-non-bindable>html</span>');
      });

      it('formats a value as " - " when no value is specified', function () {
        const f = new TestFormat();
        expect(f.convert()).to.be(' - ');
      });
    });

  });
});
