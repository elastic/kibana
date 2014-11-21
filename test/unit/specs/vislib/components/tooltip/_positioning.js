define(function (require) {
  return function TooltipPositioningTestSuite() {
    describe('positioning', function () {
      var $ = require('jquery');
      var _ = require('lodash');
      var sinon = require('test_utils/auto_release_sinon');

      var posTT = require('components/vislib/components/tooltip/_position_tooltip');
      var positions = ['north', 'south', 'east', 'west'];
      var bounds = ['top', 'left', 'bottom', 'right'];
      var $window;
      var $chart;
      var $tooltip;
      var $sizer;

      function testEl(width, height, $children) {
        var $el = $('<div>');

        var size = {
          width: _.random(width[0], width[1]),
          height: _.random(height[0], height[1])
        };

        $el.css({
          width: size.width,
          height: size.height,
          visibility: 'hidden'
        })
        .appendTo('body');

        if ($children) {
          $el.append($children);
        }

        $el.testSize = size;

        return $el;
      }

      beforeEach(function () {
        $window = testEl([500, 1000], [600, 800],
          $chart = testEl([600, 750], [350, 550],
            $tooltip = testEl([50, 100], [35, 75])
          )
        );

        $sizer = $tooltip.clone().appendTo($window);
      });

      afterEach(function () {
        $window.remove();
        $window = $chart = $tooltip = $sizer = null;
        posTT.removeClone();
      });

      function makeEvent(xPercent, yPercent) {
        xPercent = xPercent || 0.5;
        yPercent = yPercent || 0.5;

        var base = $chart.offset();

        return {
          clientX: base.left + ($chart.testSize.width * xPercent),
          clientY: base.top + ($chart.testSize.height * yPercent)
        };
      }

      describe('getTtSize()', function () {
        it('should measure the outer-size of the tooltip using an un-obstructed clone', function () {
          var w = sinon.spy($.fn, 'outerWidth');
          var h = sinon.spy($.fn, 'outerHeight');

          posTT.getTtSize($tooltip, $sizer);

          [w, h].forEach(function (spy) {
            expect(spy).to.have.property('callCount', 1);
            var matchHtml = w.thisValues.filter(function ($t) {
              return !$t.is($tooltip) && $t.html() === $tooltip.html();
            });
            expect(matchHtml).to.have.length(1);
          });
        });
      });

      describe('getBasePosition()', function () {
        it('calculates the offset values for the four positions', function () {
          var size = posTT.getTtSize($tooltip, $sizer);
          var pos = posTT.getBasePosition(size, makeEvent());

          positions.forEach(function (p) {
            expect(pos).to.have.property(p);
          });

          expect(pos.north).to.be.lessThan(pos.south);
          expect(pos.east).to.be.greaterThan(pos.west);
        });
      });

      describe('getBounds()', function () {
        it('returns the offsets for the tlrb of the element', function () {
          var cbounds = posTT.getBounds($chart);

          bounds.forEach(function (b) {
            expect(cbounds).to.have.property(b);
          });

          expect(cbounds.top).to.be.lessThan(cbounds.bottom);
          expect(cbounds.left).to.be.lessThan(cbounds.right);
        });
      });

      describe('getOverflow()', function () {
        it('determines how much the base placement overflows the containing bounds in each direction', function () {
          // size the tooltip very small so it won't collide with the edges
          $tooltip.css({ width: 15, height: 15 });
          $sizer.css({ width: 15, height: 15 });
          var size = posTT.getTtSize($tooltip, $sizer);
          expect(size).to.have.property('width', 15);
          expect(size).to.have.property('height', 15);

          // position the element based on a mouse that is in the middle of the chart
          var pos = posTT.getBasePosition(size, makeEvent(0.5, 0.5));

          var overflow = posTT.getOverflow(size, pos, [$chart, $window]);
          positions.forEach(function (p) {
            expect(overflow).to.have.property(p);

            // all positions should be less than 0 because the tooltip is so much smaller than the chart
            expect(overflow[p]).to.be.lessThan(0);
          });
        });

        it('identifies an overflow with a positive value in that direction', function () {
          var size = posTT.getTtSize($tooltip, $sizer);

          // position the element based on a mouse that is in the bottom right hand courner of the chart
          var pos = posTT.getBasePosition(size, makeEvent(0.99, 0.99));
          var overflow = posTT.getOverflow(size, pos, [$chart, $window]);

          positions.forEach(function (p) {
            expect(overflow).to.have.property(p);

            if (p === 'south' || p === 'east') {
              expect(overflow[p]).to.be.greaterThan(0);
            } else {
              expect(overflow[p]).to.be.lessThan(0);
            }
          });
        });
      });

      describe('positionTooltip() integration', function () {
        it('returns nothing if the $chart or $tooltip are not passed in', function () {
          expect(posTT() === void 0).to.be(true);
          expect(posTT(null, null, null) === void 0).to.be(true);
          expect(posTT(null, $(), $()) === void 0).to.be(true);
        });

        function check(xPercent, yPercent/*, prev, directions... */) {
          var directions = _.rest(arguments, 2);
          var event = makeEvent(xPercent, yPercent);
          var placement = posTT({
            $window: $window,
            $chart: $chart,
            $sizer: $sizer,
            event: event,
            $el: $tooltip,
            prev: _.isObject(directions[0]) ? directions.shift() : null
          });

          expect(placement).to.have.property('top').and.property('left');

          directions.forEach(function (dir) {
            switch (dir) {
            case 'top':
              expect(placement.top).to.be.lessThan(event.clientY);
              return;
            case 'bottom':
              expect(placement.top).to.be.greaterThan(event.clientY);
              return;
            case 'right':
              expect(placement.left).to.be.greaterThan(event.clientX);
              return;
            case 'left':
              expect(placement.left).to.be.lessThan(event.clientX);
              return;
            }
          });

          return placement;
        }

        describe('calculates placement of the tooltip properly', function () {
          it('mouse is in the middle', function () {
            check(0.50, 0.50, 'bottom', 'right');
          });

          it('mouse is in the top left', function () {
            check(0.10, 0.10, 'bottom', 'right');
          });

          it('mouse is in the top right', function () {
            check(0.99, 0.10, 'bottom', 'left');
          });

          it('mouse is in the bottom right', function () {
            check(0.99, 0.99, 'top', 'left');
          });

          it('mouse is in the bottom left', function () {
            check(0.10, 0.99, 'top', 'right');
          });
        });

        describe('maintain the direction of the tooltip on reposition', function () {
          it('mouse moves from the top right to the middle', function () {
            var pos = check(0.99, 0.10, 'bottom', 'left');
            check(0.50, 0.50, pos, 'bottom', 'left');
          });

          it('mouse moves from the bottom left to the middle', function () {
            var pos = check(0.10, 0.99, 'top', 'right');
            check(0.50, 0.50, pos, 'top', 'right');
          });
        });
      });
    });
  };
});