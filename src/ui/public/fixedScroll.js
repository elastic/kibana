define(function (require) {
  const $ = require('jquery');
  const _ = require('lodash');

  const SCROLLER_HEIGHT = 20;

  require('ui/modules')
  .get('kibana')
  .directive('fixedScroll', function ($timeout) {
    return {
      restrict: 'A',
      link: function ($scope, $el) {
        let $window = $(window);
        let $scroller = $('<div class="fixed-scroll-scroller">').height(SCROLLER_HEIGHT);


        /**
         * Remove the listeners bound in listen()
         * @type {function}
         */
        let unlisten = _.noop;

        /**
         * Listen for scroll events on the $scroller and the $el, sets unlisten()
         *
         * unlisten must be called before calling or listen() will throw an Error
         *
         * Since the browser emits "scroll" events after setting scrollLeft
         * the listeners also prevent tug-of-war
         *
         * @throws {Error} If unlisten was not called first
         * @return {undefined}
         */
        function listen() {
          if (unlisten !== _.noop) {
            throw new Error('fixedScroll listeners were not cleaned up properly before re-listening!');
          }

          let blockTo;
          function bind($from, $to) {
            function handler() {
              if (blockTo === $to) return (blockTo = null);
              $to.scrollLeft((blockTo = $from).scrollLeft());
            }

            $from.on('scroll', handler);
            return function () {
              $from.off('scroll', handler);
            };
          }

          unlisten = _.flow(
            bind($el, $scroller),
            bind($scroller, $el),
            function () { unlisten = _.noop; }
          );
        }

        /**
         * Revert DOM changes and event listeners
         * @return {undefined}
         */
        function cleanUp() {
          unlisten();
          $scroller.detach();
          $el.css('padding-bottom', 0);
        }

        /**
         * Modify the DOM and attach event listeners based on need.
         * Is called many times to re-setup, must be idempotent
         * @return {undefined}
         */
        function setup() {
          cleanUp();

          const containerWidth = $el.width();
          const contentWidth = $el.prop('scrollWidth');
          const containerHorizOverflow = contentWidth - containerWidth;

          const elTop = $el.offset().top - $window.scrollTop();
          const elBottom = elTop + $el.height();
          const windowVertOverflow = elBottom - $window.height();

          const requireScroller = containerHorizOverflow > 0 && windowVertOverflow > 0;
          if (!requireScroller) return;

          // push the content away from the scroller
          $el.css('padding-bottom', SCROLLER_HEIGHT);

          // fill the scroller with a dummy element that mimics the content
          $scroller
          .width(containerWidth)
          .html($('<div>').css({ width: contentWidth, height: SCROLLER_HEIGHT }))
          .insertAfter($el);

          // listen for scroll events
          listen();
        }

        // reset when the width or scrollWidth of the $el changes
        $scope.$watchMulti([
          function () { return $el.prop('scrollWidth'); },
          function () { return $el.width(); }
        ], setup);

        // cleanup when the scope is destroyed
        $scope.$on('$destroy', function () {
          cleanUp();
          $scroller = $window = null;
        });
      }
    };
  });
});
