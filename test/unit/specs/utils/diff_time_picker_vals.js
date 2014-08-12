define(function (require) {
  var moment = require('moment');

  require('angular').module('DiffTimePickerValues', ['kibana']);

  describe('Diff Time Picker Values', function () {
    var diffTimePickerValues;

    beforeEach(module('DiffTimePickerValues'));
    beforeEach(inject(function (Private) {
      diffTimePickerValues = Private(require('utils/diff_time_picker_vals'));
    }));

    it('accepts two undefined values', function () {
      var diff = diffTimePickerValues(undefined, undefined);
      expect(diff).to.be(false);
    });

    describe('datemath ranges', function () {
      it('knows a match', function () {
        var diff = diffTimePickerValues(
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
        var diff = diffTimePickerValues(
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

    describe('a datemath range, and a moment range', function () {
      it('is always different', function () {
        var diff = diffTimePickerValues(
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
        var to = moment();
        var from = moment().add(1, 'day');

        var diff = diffTimePickerValues(
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
        var to = moment();
        var from = moment().add(1, 'day');
        var from2 = moment().add(2, 'day');

        var diff = diffTimePickerValues(
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
      var diff = diffTimePickerValues({}, {});
      expect(diff).to.be(false);
    });
  });
});