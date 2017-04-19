import _ from 'lodash';
import expect from 'expect.js';
import moment from 'moment';
import ngMock from 'ng_mock';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { UtilsBrushEventProvider } from 'ui/utils/brush_event';

describe('brushEvent', function () {
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

  describe('returned function', function () {
    let $state;
    let brushEvent;

    const baseState = {
      filters:[],
    };

    const baseEvent = {
      data: {
        fieldFormatter: _.constant({}),
      },
    };

    beforeEach(ngMock.inject(function (Private) {
      baseEvent.data.indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      $state = _.cloneDeep(baseState);
      brushEvent = brushEventFn($state);
    }));

    it('should be a function', function () {
      expect(brushEvent).to.be.a(Function);
    });

    it('ignores event when data.xAxisField not provided', function () {
      const event = _.cloneDeep(baseEvent);
      brushEvent(event);
      expect($state)
        .not.have.property('$newFilters');
    });

    describe('handles an event when the x-axis field is a date', function () {
      let dateEvent;
      const dateField = {
        name: 'dateField',
        type: 'date'
      };

      beforeEach(ngMock.inject(function () {
        dateEvent = _.cloneDeep(baseEvent);
        dateEvent.data.xAxisField = dateField;
      }));

      it('by ignoring the event when range spans zero time', function () {
        const event = _.cloneDeep(dateEvent);
        event.range = [1388559600000, 1388559600000];
        brushEvent(event);
        expect($state)
          .not.have.property('$newFilters');
      });

      it('by updating the timefilter', function () {
        const event = _.cloneDeep(dateEvent);
        const DAY_IN_MS = 24 * 60 * 60 * 1000;
        event.range = [1388559600000, 1388559600000 + DAY_IN_MS];
        brushEvent(event);
        expect(timefilter.time.mode).to.be('absolute');
        expect(moment.isMoment(timefilter.time.from))
          .to.be(true);
        // Set to a baseline timezone for comparison.
        expect(timefilter.time.from.utcOffset(0).format('YYYY-MM-DD'))
          .to.equal('2014-01-01');
        expect(moment.isMoment(timefilter.time.to))
          .to.be(true);
        // Set to a baseline timezone for comparison.
        expect(timefilter.time.to.utcOffset(0).format('YYYY-MM-DD'))
          .to.equal('2014-01-02');
      });
    });

    describe('handles an event when the x-axis field is a number', function () {
      let numberEvent;
      const numberField = {
        name: 'numberField',
        type: 'number'
      };

      beforeEach(ngMock.inject(function () {
        numberEvent = _.cloneDeep(baseEvent);
        numberEvent.data.xAxisField = numberField;
      }));

      it('by ignoring the event when range does not span at least 2 values', function () {
        const event = _.cloneDeep(numberEvent);
        event.range = [1];
        brushEvent(event);
        expect($state)
          .not.have.property('$newFilters');
      });

      it('by creating a new filter', function () {
        const event = _.cloneDeep(numberEvent);
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

      it('by updating the existing range filter', function () {
        const event = _.cloneDeep(numberEvent);
        event.range = [3,7];
        $state.filters.push({
          meta: {
            key: 'numberField'
          },
          range: { gte: 1, lt: 4 }
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

      it('by updating the existing scripted filter', function () {
        const event = _.cloneDeep(numberEvent);
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
