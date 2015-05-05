define(function (require) {
  describe('Stringify Component', function () {
    var _ = require('lodash');
    var $ = require('jquery');

    var fieldFormats;
    var FieldFormat;
    var config;
    var $rootScope;

    var formatIds = [
      'bytes',
      'date',
      'ip',
      'number',
      'percent',
      'string',
      'url',
      '_source'
    ];


    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector) {
      fieldFormats = Private(require('registry/field_formats'));
      FieldFormat = Private(require('components/index_patterns/_field_format/FieldFormat'));
      config = $injector.get('config');
      $rootScope = $injector.get('$rootScope');
    }));

    it('registers all of the fieldFormats', function () {
      expect(_.difference(fieldFormats.raw, formatIds.map(fieldFormats.getType))).to.eql([]);
    });

    describe('conformance', function () {
      formatIds.forEach(function (id) {
        var instance;
        var Type;

        beforeEach(function () {
          Type = fieldFormats.getType(id);
          instance = fieldFormats.getInstance(id);
        });

        describe(id + ' Type', function () {
          it('has an id', function () {
            expect(Type.id).to.be.a('string');
          });

          it('has a title', function () {
            expect(Type.title).to.be.a('string');
          });

          it('declares compatible field formats as a string or array', function () {
            expect(Type.fieldType).to.be.ok();
            expect(_.isString(Type.fieldType) || _.isArray(Type.fieldType)).to.be(true);
          });
        });

        describe(id + ' Instance', function () {
          it('extends FieldFormat', function () {
            expect(instance).to.be.a(FieldFormat);
          });
        });
      });
    });

    describe('Bytes format', basicPatternTests('bytes', require('numeral')));
    describe('Percent Format', basicPatternTests('percent', require('numeral')));
    describe('Date Format', basicPatternTests('date', require('moment')));

    describe('Number Format', function () {
      basicPatternTests('number', require('numeral'))();

      it('tries to parse strings', function () {
        var number = new (fieldFormats.getType('number'))({ pattern: '0.0b' });
        expect(number.convert(123.456)).to.be('123.5B');
        expect(number.convert('123.456')).to.be('123.5B');
      });

    });

    function basicPatternTests(id, lib) {
      var confKey = id === 'date' ? 'dateFormat' : 'format:' + id + ':defaultPattern';

      return function () {
        it('converts using the format:' + id + ':defaultPattern config', function () {
          var inst = fieldFormats.getInstance(id);
          [
            '0b',
            '0 b',
            '0.[000] b',
            '0.[000]b',
            '0.[0]b'
          ].forEach(function (pattern) {
            var num = _.random(-10000, 10000, true);
            config.set(confKey, pattern);
            expect(inst.convert(num)).to.be(lib(num).format(pattern));
          });
        });

        it('uses the pattern param if available', function () {
          var num = _.random(-10000, 10000, true);
          var defFormat = '0b';
          var customFormat = '0.00000%';

          config.set(confKey, defFormat);
          var defInst = fieldFormats.getInstance(id);

          var Type = fieldFormats.getType(id);
          var customInst = new Type({ pattern: customFormat });

          expect(defInst.convert(num)).to.not.be(customInst.convert(num));
          expect(defInst.convert(num)).to.be(lib(num).format(defFormat));
          expect(customInst.convert(num)).to.be(lib(num).format(customFormat));
        });
      };
    }

    describe('Ip format', function () {
      it('convers a value from a decimal to a string', function () {
        var ip = fieldFormats.getInstance('ip');
        expect(ip.convert(1186489492)).to.be('70.184.100.148');
      });
    });

    describe('Url Format', function () {
      var Url;

      beforeEach(function () {
        Url = fieldFormats.getType('url');
      });

      it('ouputs a simple <a> tab by default', function () {
        var url = new Url();

        var $a = $(url.convert('http://elastic.co', 'html'));
        expect($a.is('a')).to.be(true);
        expect($a.size()).to.be(1);
        expect($a.attr('href')).to.be('http://elastic.co');
        expect($a.attr('target')).to.be('_blank');
        expect($a.children().size()).to.be(0);
      });

      it('outputs an <image> if type === "img"', function () {
        var url = new Url({ type: 'img' });

        var $img = $(url.convert('http://elastic.co', 'html'));
        expect($img.is('img')).to.be(true);
        expect($img.attr('src')).to.be('http://elastic.co');
      });

      it('only outputs the url if the contentType === "text"', function () {
        var url = new Url();
        expect(url.convert('url', 'text')).to.be('url');
      });

      describe('template', function () {

        it('accepts a template', function () {
          var url = new Url({ template: 'url: {{ value }}' });
          var $a = $(url.convert('url', 'html'));
          expect($a.is('a')).to.be(true);
          expect($a.size()).to.be(1);
          expect($a.attr('href')).to.be('url: url');
          expect($a.attr('target')).to.be('_blank');
          expect($a.children().size()).to.be(0);
        });

        it('renders for text contentType', function () {
          var url = new Url({ template: 'url: {{ value }}' });
          expect(url.convert('url', 'text')).to.be('url: url');
        });

        it('ignores unknown variables', function () {
          var url = new Url({ template: '{{ not really a var }}' });
          expect(url.convert('url', 'text')).to.be('');
        });

        it('does not allow executing code in variable expressions', function () {
          window.SHOULD_NOT_BE_TRUE = false;
          var url = new Url({ template: '{{ (window.SHOULD_NOT_BE_TRUE = true) && value }}' });
          expect(url.convert('url', 'text')).to.be('');
        });

        describe('', function () {
          before(function () {
            Object.prototype.cantStopMeNow = {
              toString: function () {
                return 'fail';
              },
              cantStopMeNow: null
            };
          });

          it('does not get values from the prototype chain', function () {
            var url = new Url({ template: '{{ cantStopMeNow }}' });
            expect(url.convert('url', 'text')).to.be('');
          });

          after(function () {
            delete Object.prototype.cantStopMeNow;
          });
        });
      });
    });

    describe('Source format', function () {
      var indexPattern;
      var hits;
      var format;
      var convertHtml;

      beforeEach(inject(function (Private) {
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        hits = Private(require('fixtures/hits'));
        format = fieldFormats.getInstance('_source');
        convertHtml = format.getConverterFor('html');
      }));

      it('uses the _source, field, and hit to create a <dl>', function () {
        var hit = _.first(hits);
        var $dl = $(convertHtml(hit._source, indexPattern.fields.byName._source, hit));
        expect($dl.is('dl')).to.be.ok();
        expect($dl.find('dt')).to.have.length(_.keys(indexPattern.flattenHit(hit)).length);
      });
    });
  });
});
