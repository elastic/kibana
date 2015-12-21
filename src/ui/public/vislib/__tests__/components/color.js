var angular = require('angular');
var expect = require('expect.js');
var ngMock = require('ngMock');
const _ = require('lodash');
const d3 = require('d3');

describe('Vislib Color Module Test Suite', function () {
  var seedColors;
  var mappedColors;
  let config;

  describe('Color (main)', function () {
    let previousConfig;
    var getColors;
    var arr = ['good', 'better', 'best', 'never', 'let', 'it', 'rest'];
    var arrayOfNumbers = [1, 2, 3, 4, 5];
    var arrayOfUndefinedValues = [undefined, undefined, undefined];
    var arrayOfObjects = [{}, {}, {}];
    var arrayOfBooleans = [true, false, true];
    var arrayOfNullValues = [null, null, null];
    var emptyObject = {};
    var nullValue = null;
    var notAValue;
    var color;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject((Private, config) => {
      previousConfig = config.get('visualization:colorMapping');
      config.set('visualization:colorMapping', {});
      seedColors = Private(require('ui/vislib/components/color/seed_colors'));
      getColors = Private(require('ui/vislib/components/color/color'));
      mappedColors = Private(require('ui/vislib/components/color/mapped_colors'));
      color = getColors(arr, {});
    }));

    afterEach(ngMock.inject((config) => {
      config.set('visualization:colorMapping', previousConfig);
    }));

    it('should throw an error if input is not an array', function () {
      expect(function () {
        getColors(200);
      }).to.throwError();

      expect(function () {
        getColors('help');
      }).to.throwError();

      expect(function () {
        getColors(true);
      }).to.throwError();

      expect(function () {
        getColors(notAValue);
      }).to.throwError();

      expect(function () {
        getColors(nullValue);
      }).to.throwError();

      expect(function () {
        getColors(emptyObject);
      }).to.throwError();
    });

    context('when array is not composed of numbers, strings, or undefined values', function () {
      it('should throw an error', function () {
        expect(function () {
          getColors(arrayOfObjects);
        }).to.throwError();

        expect(function () {
          getColors(arrayOfBooleans);
        }).to.throwError();

        expect(function () {
          getColors(arrayOfNullValues);
        }).to.throwError();
      });
    });

    context('when input is an array of strings, numbers, or undefined values', function () {
      it('should not throw an error', function () {
        expect(function () {
          getColors(arr);
        }).to.not.throwError();

        expect(function () {
          getColors(arrayOfNumbers);
        }).to.not.throwError();

        expect(function () {
          getColors(arrayOfUndefinedValues);
        }).to.not.throwError();
      });
    });

    it('should be a function', function () {
      expect(typeof getColors).to.be('function');
    });

    it('should return a function', function () {
      expect(typeof color).to.be('function');
    });

    it('should return the first hex color in the seed colors array', function () {
      expect(color(arr[0])).to.be(seedColors[0]);
    });

    it('should return the value from the mapped colors', function () {
      expect(color(arr[1])).to.be(mappedColors.get(arr[1]));
    });

    it('should return the value from the specified color mapping overrides', function () {
      const colorFn = getColors(arr, {good: 'red'});
      expect(colorFn('good')).to.be('red');
    });
  });

  describe('Seed Colors', function () {
    it('should return an array', function () {
      expect(seedColors instanceof Array).to.be(true);
    });
  });

  describe('Mapped Colors', () => {
    let previousConfig;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject((Private, config) => {
      previousConfig = config.get('visualization:colorMapping');
      mappedColors = Private(require('ui/vislib/components/color/mapped_colors'));
      mappedColors.mapping = {};
    }));

    afterEach(ngMock.inject((config) => {
      config.set('visualization:colorMapping', previousConfig);
    }));

    it('should properly map keys to colors', ngMock.inject((config) => {
      config.set('visualization:colorMapping', {});

      const arr = _.range(60);
      mappedColors.mapKeys(arr);
      expect(_(mappedColors.mapping).values().size()).to.be(arr.length);
    }));

    it('should not include colors used by the config', ngMock.inject((config) => {
      const newConfig = {bar: seedColors[0]};
      config.set('visualization:colorMapping', newConfig);

      const arr = ['foo', 'baz', 'qux'];
      mappedColors.mapKeys(arr);

      const colorValues = _(mappedColors.mapping).values();
      expect(colorValues.contains(seedColors[0])).to.be(false);
      expect(colorValues.uniq().size()).to.be(arr.length);
    }));

    it('should treat different formats of colors as equal', ngMock.inject((config) => {
      const color = d3.rgb(seedColors[0]);
      const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`;
      const newConfig = {bar: rgb};
      config.set('visualization:colorMapping', newConfig);

      const arr = ['foo', 'bar', 'baz', 'qux'];
      mappedColors.mapKeys(arr);

      const expectedSize = _(arr).difference(_.keys(newConfig)).size();
      expect(_(mappedColors.mapping).values().uniq().size()).to.be(expectedSize);
      expect(mappedColors.get(arr[0])).to.not.be(seedColors[0]);
      expect(mappedColors.get('bar')).to.be(seedColors[0]);
    }));
  });

  describe('Color Palette', function () {
    var colorCount = 42;
    var colors;
    var colorFn;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      seedColors = Private(require('ui/vislib/components/color/seed_colors'));
      colorFn = Private(require('ui/vislib/components/color/color_palette'));
      colors = colorFn(colorCount);
    }));

    it('should be a function', function () {
      expect(colorFn).to.be.a(Function);
    });

    it('should return an array', function () {
      expect(colors).to.be.a(Array);
    });

    it('should return an array of the same length as the input', function () {
      expect(colors.length).to.be(colorCount);
    });

    it('should use the seed colors first', function () {
      _.each(seedColors, function (color, i) {
        expect(color).to.equal(colors[i]);
      });
    });

    it('should then generate a darker version of the seed', function () {
      var parsedSeed = d3.hsl(seedColors[0]);
      var parsedResult = d3.hsl(colors[seedColors.length]);
      expect(parsedResult.l).to.be.lessThan(parsedSeed.l);
    });

    it('followed by a lighter version', function () {
      var parsedSeed = d3.hsl(seedColors[0]);
      var parsedResult = d3.hsl(colors[seedColors.length * 2]);
      expect(parsedResult.l).to.be.greaterThan(parsedSeed.l);
    });

    it('and then a darker version again', function () {
      var parsedSeed = d3.hsl(seedColors[0]);
      var parsedResult = d3.hsl(colors[seedColors.length * 3]);
      expect(parsedResult.l).to.be.lessThan(parsedSeed.l);
    });


  });
});
