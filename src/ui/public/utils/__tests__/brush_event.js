import _ from 'lodash';
import expect from 'expect.js';
import moment from 'moment';
import ngMock from 'ng_mock';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import UtilsBrushEventProvider from 'ui/utils/brush_event';

describe('Utils brush_event()', function () {

  let brushEventFn;
  let timefilter;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector, _timefilter_) {
    brushEventFn = Private(UtilsBrushEventProvider);
    timefilter = _timefilter_;
  }));

  it('is a function that returns a function', function () {
    expect(brushEventFn).to.be.a(Function);
    expect(brushEventFn({})).to.be.a(Function);
  });

  describe('brushEvent($state)()', function () {
    let $state;
    let brushEvent;
    const baseEvent = {
      data: {
        fieldFormatter: _.constant({})
      }
    };

    beforeEach(ngMock.inject(function (Private, $injector) {
      baseEvent.data.indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      $state = {filters:[]};
      brushEvent = brushEventFn($state);
    }));

    it('should be a function', function () {
      expect(brushEvent).to.be.a(Function);
    });

    it('ignores event when data.xAxisField not provided', function () {
      let event = _.cloneDeep(baseEvent);
      brushEvent(event);
      expect($state)
        .not.have.property('$newFilters');
    });

    describe('Processing event, x-axis field is date', function () {
      let dateEvent;
      const dateField = {
        name: 'dateField',
        type: 'date'
      };

      beforeEach(ngMock.inject(function (Private, $injector) {
        dateEvent = _.cloneDeep(baseEvent);
        dateEvent.data.xAxisField = dateField;
      }));

      it('ignore event when range spans zero time', function () {
        let event = _.cloneDeep(dateEvent);
        event.range = [1388559600000, 1388559600000];
        brushEvent(event);
        expect($state)
          .not.have.property('$newFilters');
      });

      it('update timefilter', function () {
        let event = _.cloneDeep(dateEvent);
        event.range = [1388559600000, 1388646000000];
        brushEvent(event);
        expect(timefilter.time.mode).to.be('absolute');
        expect(moment.isMoment(timefilter.time.to))
          .to.be(true);
        expect(timefilter.time.to.format('YYYY-MM-DD'))
          .to.equal('2014-01-02');
        expect(moment.isMoment(timefilter.time.from))
          .to.be(true);
        expect(timefilter.time.from.format('YYYY-MM-DD'))
          .to.equal('2014-01-01');
      });
    });

    describe('Processing event, x-axis field is number', function () {
      let numberEvent;
      const numberField = {
        name: 'numberField',
        type: 'number'
      };

      beforeEach(ngMock.inject(function (Private, $injector) {
        numberEvent = _.cloneDeep(baseEvent);
        numberEvent.data.xAxisField = numberField;
      }));

      it('ignore event when range does not span at least 2 values', function () {
        let event = _.cloneDeep(numberEvent);
        event.range = [1];
        brushEvent(event);
        expect($state)
          .not.have.property('$newFilters');
      });

      it('create new filter', function () {
        let event = _.cloneDeep(numberEvent);
        event.range = [1,2,3,4];
        brushEvent(event);
        expect($state)
          .to.have.property('$newFilters');
        expect($state.filters.length)
         .to.equal(0);
        expect($state.$newFilters.length)
         .to.equal(1);
        expect($state.$newFilters[0].range.numberField.gte)
         .to.equal(1);
        expect($state.$newFilters[0].range.numberField.lt)
         .to.equal(4);
      });

      it('update existing range filter', function () {
        let event = _.cloneDeep(numberEvent);
        event.range = [3,7];
        $state.filters.push({
          meta: {
            key: 'numberField'
          },
          range: {gte: 1, lt: 4}
        });
        brushEvent(event);
        expect($state)
          .not.have.property('$newFilters');
        expect($state.filters.length)
         .to.equal(1);
        expect($state.filters[0].range.numberField.gte)
         .to.equal(3);
        expect($state.filters[0].range.numberField.lt)
         .to.equal(7);
      });

      it('update existing scripted filter', function () {
        let event = _.cloneDeep(numberEvent);
        event.range = [3,7];
        $state.filters.push({
          meta: {
            key: 'numberField'
          },
          script: {
            script: {
              params: {
                gte: 1,
                lt: 4
              }
            }
          }
        });
        brushEvent(event);
        expect($state)
          .not.have.property('$newFilters');
        expect($state.filters.length)
         .to.equal(1);
        expect($state.filters[0].script.script.params.gte)
         .to.equal(3);
        expect($state.filters[0].script.script.params.lt)
         .to.equal(7);
      });
    });
  });
});