import expect from 'expect.js';
import ngMock from 'ng_mock';
import $ from 'jquery';
import _ from 'lodash';
import data from 'fixtures/vislib/mock_data/terms/_seriesMultiple';
import FixturesVislibVisFixtureProvider from 'fixtures/vislib/_vis_fixture';
import 'ui/persisted_state';

describe('Vislib Gauge Chart Test Suite', function () {
  let PersistedState;
  let vislibVis;
  let vis;
  let persistedState;
  let chartEl;
  const visLibParams = {
    type: 'gauge',
    addTooltip: true,
    addLegend: false,
    gauge: {
      verticalSplit: false,
      autoExtend: false,
      percentageMode: false,
      gaugeStyle: 'Full',
      backStyle: 'Full',
      orientation: 'vertical',
      colorSchema: 'Green to Red',
      colorsRange: [
        { from: 0, to: 1500 },
        { from: 1500, to: 2500 },
        { from: 2500, to: 3000 }
      ],
      invertColors: false,
      labels: {
        show: true,
        color: 'black'
      },
      scale: {
        show: true,
        labels: false,
        color: '#333',
        width: 2
      },
      type: 'meter',
      style: {
        bgWidth: 0.9,
        width: 0.9,
        mask: false,
        bgMask: false,
        maskBars: 50,
        bgFill: '#eee',
        subText: '',
      }
    }
  };

  function generateVis(opts = {}) {
    const config = _.defaultsDeep({}, opts, visLibParams);
    if (vis) {
      vis.destroy();
      $('.visualize-chart').remove();
    }
    vis = vislibVis(config);
    persistedState = new PersistedState();
    vis.on('brush', _.noop);
    vis.render(data, persistedState);
    chartEl = vis.handler.charts[0].chartEl;
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    vislibVis = Private(FixturesVislibVisFixtureProvider);
    PersistedState = $injector.get('PersistedState');
    generateVis();
  }));

  afterEach(function () {
    vis.destroy();
    $('.visualize-chart').remove();
  });

  it('creates meter gauge', function () {
    expect($(chartEl).find('svg').length).to.equal(5);
    expect($(chartEl).find('svg > g > g > text').text()).to.equal('2820231918357341352');
  });

  it('creates circle gauge', function () {
    generateVis({
      gauge: {
        minAngle: 0,
        maxAngle: 2 * Math.PI
      }
    });
    expect($(chartEl).find('svg').length).to.equal(5);
  });

  it('creates gauge with percentage mode', function () {
    generateVis({
      gauge: {
        percentageMode: true
      }
    });
    expect($(chartEl).find('svg > g > g > text').text()).to.equal('94%77%61%24%45%');
  });

  it('creates gauge with vertical mode', function () {
    generateVis({
      gauge: {
        verticalSplit: true
      }
    });
    expect($(chartEl).find('svg').width()).to.equal($(chartEl).width());
  });

  it('applies range settings correctly', function () {
    const paths = $(chartEl).find('svg > g > g:nth-child(1) > path:nth-child(2)');
    const fills = [];
    paths.each(function () { fills.push(this.style.fill); });
    expect(fills).to.eql([
      'rgb(165, 0, 38)',
      'rgb(255, 255, 190)',
      'rgb(255, 255, 190)',
      'rgb(0, 104, 55)',
      'rgb(0, 104, 55)'
    ]);
  });

  it('applies color schema correctly', function () {
    generateVis({
      gauge: {
        colorSchema: 'Blues'
      }
    });
    const paths = $(chartEl).find('svg > g > g:nth-child(1) > path:nth-child(2)');
    const fills = [];
    paths.each(function () { fills.push(this.style.fill); });
    expect(fills).to.eql([
      'rgb(8, 48, 107)',
      'rgb(107, 174, 214)',
      'rgb(107, 174, 214)',
      'rgb(247, 251, 255)',
      'rgb(247, 251, 255)'
    ]);
  });
});
