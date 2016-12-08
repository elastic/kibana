import expect from 'expect.js';
import ngMock from 'ng_mock';
import getColors from 'ui/vislib/components/color/heatmap_color';

describe('Vislib Heatmap Color Module Test Suite', function () {
  const emptyObject = {};
  const nullValue = null;
  let notAValue;

  beforeEach(ngMock.module('kibana'));

  it('should throw an error if input is not a number', function () {
    expect(function () {
      getColors([200]);
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

  it('should throw an error if input is less than 0', function () {
    expect(function () {
      getColors(-2);
    }).to.throwError();
  });

  it('should throw an error if input is greater than 9', function () {
    expect(function () {
      getColors(10);
    }).to.throwError();
  });

  it('should be a function', function () {
    expect(typeof getColors).to.be('function');
  });

  it('should return a color for numbers from 0 to 9', function () {
    const colorRegex = /^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/;
    const schema = 'Greens';
    for (let i = 0; i < 10; i++) {
      expect(getColors(i / 10, schema)).to.match(colorRegex);
    }
  });

});
