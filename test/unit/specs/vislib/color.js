define(function (require) {
  var angular = require('angular');

  angular.module('ColorUtilService', ['kibana']);
  angular.module('SeedColorUtilService', ['kibana']);
  angular.module('ColorObjUtilService', ['kibana']);
  angular.module('ColorPaletteUtilService', ['kibana']);

  describe('Vislib Color Module Test Suite', function () {
    var seedColors;

    describe('Color (main)', function () {
      var getColors;
      var arr = ['good', 'better', 'best', 'never', 'let', 'it', 'rest'];
      var str = 'test';
      var error;
      var color;

      beforeEach(function () {
        module('ColorUtilService');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          seedColors = Private(require('components/vislib/components/color/seed_colors'));
          getColors = Private(require('components/vislib/components/color/color'));
//          error = getColors(str);
          color = getColors(arr);
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

//      it('should throw a TypeError when the input value is not an array', function () {
//        console.log(error);
//        expect(error).to.throwException(typeof str + ' should be an array of strings or numbers');
//      });
    });

    describe('Seed Colors', function () {

      beforeEach(function () {
        module('SeedColorUtilService');
      });

      it('should return an array', function () {
        expect(seedColors instanceof Array).to.be(true);
      });

      it('should return an array of length 72', function () {
        expect(seedColors.length).to.be(72);
      });
    });

    describe('Color Palette', function () {
      var num1 = 45;
      var num2 = 72;
      var num3 = 90;
      var createColorPalette;
      var colorPalette;

      beforeEach(function () {
        module('ColorPaletteUtilService');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          createColorPalette = Private(require('components/vislib/components/color/color_palette'));
          colorPalette = createColorPalette(num1);
        });
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
});