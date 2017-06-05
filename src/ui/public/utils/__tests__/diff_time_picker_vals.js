
import moment from 'moment';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import { UtilsDiffTimePickerValsProvider } from 'ui/utils/diff_time_picker_vals';

describe('Diff Time Picker Values', function () {
  let diffTimePickerValues;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    diffTimePickerValues = Private(UtilsDiffTimePickerValsProvider);
  }));

  it('accepts two undefined values', function () {
    const diff = diffTimePickerValues(undefined, undefined);
    expect(diff).to.be(false);
  });

  describe('dateMath ranges', function () {
    it('knows a match', function () {
      const diff = diffTimePickerValues(
        {
          to: 'now',
          from: 'now-7d'
        },
        {
          to: 'now',
          from: 'now-7d'
        }
      );

      expect(diff).to.be(false);
    });
    it('knows a difference', function () {
      const diff = diffTimePickerValues(
        {
          to: 'now',
          from: 'now-7d'
        },
        {
          to: 'now',
          from: 'now-1h'
        }
      );

      expect(diff).to.be(true);
    });
  });

  describe('a dateMath range, and a moment range', function () {
    it('is always different', function () {
      const diff = diffTimePickerValues(
        {
          to: moment(),
          from: moment()
        },
        {
          to: 'now',
          from: 'now-1h'
        }
      );

      expect(diff).to.be(true);
    });
  });

  describe('moment ranges', function () {
    it('uses the time value of moments for comparison', function () {
      const to = moment();
      const from = moment().add(1, 'day');

      const diff = diffTimePickerValues(
        {
          to: to.clone(),
          from: from.clone()
        },
        {
          to: to.clone(),
          from: from.clone()
        }
      );

      expect(diff).to.be(false);
    });

    it('fails if any to or from is different', function () {
      const to = moment();
      const from = moment().add(1, 'day');
      const from2 = moment().add(2, 'day');

      const diff = diffTimePickerValues(
        {
          to: to.clone(),
          from: from.clone()
        },
        {
          to: to.clone(),
          from: from2.clone()
        }
      );

      expect(diff).to.be(true);
    });
  });

  it('does not fall apart with unusual values', function () {
    const diff = diffTimePickerValues({}, {});
    expect(diff).to.be(false);
  });
});
