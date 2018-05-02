import expect from 'expect.js';
import ngMock from 'ng_mock';
import { getHeatmapColors } from '../../components/color/heatmap_color';

describe('Vislib Heatmap Color Module Test Suite', function () {
  const emptyObject = {};
  const nullValue = null;
  let notAValue;

  beforeEach(ngMock.module('kibana'));

  it('should throw an error if schema is invalid', function () {
    expect(function () {
      getHeatmapColors(4, 'invalid schema');
    }).to.throwError();
  });

  it('should throw an error if input is not a number', function () {
    expect(function () {
      getHeatmapColors([200], 'Greens');
    }).to.throwError();

    expect(function () {
      getHeatmapColors('help', 'Greens');
    }).to.throwError();

    expect(function () {
      getHeatmapColors(true, 'Greens');
    }).to.throwError();

    expect(function () {
      getHeatmapColors(notAValue, 'Greens');
    }).to.throwError();

    expect(function () {
      getHeatmapColors(nullValue, 'Greens');
    }).to.throwError();

    expect(function () {
      getHeatmapColors(emptyObject, 'Greens');
    }).to.throwError();
  });

  it('should throw an error if input is less than 0', function () {
    expect(function () {
      getHeatmapColors(-2, 'Greens');
    }).to.throwError();
  });

  it('should throw an error if input is greater than 9', function () {
    expect(function () {
      getHeatmapColors(10, 'Greens');
    }).to.throwError();
  });

  it('should be a function', function () {
    expect(typeof getHeatmapColors).to.be('function');
  });

  it('should return a color for numbers from 0 to 9', function () {
    const colorRegex = /^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/;
    const schema = 'Greens';
    for (let i = 0; i < 10; i++) {
      expect(getHeatmapColors(i / 10, schema)).to.match(colorRegex);
    }
  });

  describe('drawColormap function', () => {
    it('should return canvas element', () => {
      const response = getHeatmapColors.prototype.drawColormap('Greens');
      expect(typeof response).to.equal('object');
      expect(response instanceof window.HTMLElement).to.equal(true);
    });
  });

});
