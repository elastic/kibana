import $ from 'jquery';
import _ from 'lodash';
import { uiModules } from 'ui/modules';

const SCROLLER_HEIGHT = 20;

/**
 * This directive adds a fixed horizontal scrollbar to the bottom of the window that proxies its scroll events
 * to the target element's real scrollbar. This is useful when the target element's horizontal scrollbar
 * might be waaaay down the page, like the doc table on Discover.
 */
uiModules
.get('kibana')
.directive('fixedScroll', function (debounce) {
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

      let width;
      let scrollWidth;
      function checkWidth() {
        const newScrollWidth = $el.prop('scrollWidth');
        const newWidth = $el.width();

        if (scrollWidth !== newScrollWidth || width !== newWidth) {
          $scope.$apply(setup);

          scrollWidth = newScrollWidth;
          width = newWidth;
        }
      }

      const debouncedCheckWidth = debounce(checkWidth, 100, {
        invokeApply: false,
      });
      $scope.$watch(debouncedCheckWidth);

      // cleanup when the scope is destroyed
      $scope.$on('$destroy', function () {
        cleanUp();
        debouncedCheckWidth.cancel();
        $scroller = $window = null;
      });
    }
  };
});
