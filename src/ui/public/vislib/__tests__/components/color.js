var angular = require('angular');
var expect = require('expect.js');
var ngMock = require('ngMock');

describe('Vislib Color Module Test Suite', function () {
  var seedColors;
  var MappedColors;
  var mappedColors;

  describe('Color (main)', function () {
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
    beforeEach(ngMock.inject(function (Private) {
      seedColors = Private(require('ui/vislib/components/color/seed_colors'));
      getColors = Private(require('ui/vislib/components/color/color'));
      MappedColors = Private(require('ui/vislib/components/color/mapped_colors'));
      mappedColors = new MappedColors();
      color = getColors(arr);
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

    it('should throw an error if array is not composed of numbers, strings, or ' +
      'undefined values', function () {
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

    it('should not throw an error if input is an array of strings, numbers, or' +
      ' undefined values', function () {
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
  });

  describe('Seed Colors', function () {
    it('should return an array', function () {
      expect(seedColors instanceof Array).to.be(true);
    });
  });

  describe('Mapped Colors', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      MappedColors = Private(require('ui/vislib/components/color/mapped_colors'));
      mappedColors = new MappedColors();
    }));

    it('should clear all the keys from the map table', function () {
      mappedColors.reset();
      expect(mappedColors.count()).to.be(0);
    });

    it('should return the color for the added value', function () {
      mappedColors.reset();
      mappedColors.add('value1', '#somecolor');
      expect(mappedColors.get('value1')).to.be('#somecolor');
    });

    it('should return the count of mapped keys', function () {
      mappedColors.reset();
      mappedColors.add('value1', '#color1');
      mappedColors.add('value2', '#color2');
      expect(mappedColors.count()).to.be(2);
    });

    it('should return all the colors in the map', function () {
      mappedColors.reset();
      mappedColors.add('value1', '#colors1');
      mappedColors.add('value3', '#newColor');
      expect(mappedColors.all()).to.eql(['#colors1', '#newColor']);
    });
  });

  describe('Color Palette', function () {
    var num1 = 45;
    var num2 = 72;
    var num3 = 90;
    var string = 'Welcome';
    var bool = true;
    var nullValue = null;
    var emptyArr = [];
    var emptyObject = {};
    var notAValue;
    var createColorPalette;
    var colorPalette;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      seedColors = Private(require('ui/vislib/components/color/seed_colors'));
      createColorPalette = Private(require('ui/vislib/components/color/color_palette'));
      colorPalette = createColorPalette(num1);
    }));

    it('should throw an error if input is not a number', function () {
      expect(function () {
        createColorPalette(string);
      }).to.throwError();

      expect(function () {
        createColorPalette(bool);
      }).to.throwError();

      expect(function () {
        createColorPalette(nullValue);
      }).to.throwError();

      expect(function () {
        createColorPalette(emptyArr);
      }).to.throwError();

      expect(function () {
        createColorPalette(emptyObject);
      }).to.throwError();

      expect(function () {
        createColorPalette(notAValue);
      }).to.throwError();
    });

    it('should be a function', function () {
      expect(typeof createColorPalette).to.be('function');
    });

    it('should return an array', function () {
      expect(colorPalette instanceof Array).to.be(true);
    });

    it('should return an array of the same length as the input', function () {
      expect(colorPalette.length).to.be(num1);
    });

    it('should return the seed color array when input length is 72', function () {
      expect(createColorPalette(num2)[71]).to.be(seedColors[71]);
    });

    it('should return an array of the same length as the input when input is greater than 72', function () {
      expect(createColorPalette(num3).length).to.be(num3);
    });

    it('should create new darker colors when input is greater than 72', function () {
      expect(createColorPalette(num3)[72]).not.to.equal(seedColors[0]);
    });

  });
});
