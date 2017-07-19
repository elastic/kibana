import $ from 'jquery';
import ResizeObserver from 'resize-observer-polyfill';
import { isEqual } from 'lodash';

import { EventsProvider } from 'ui/events';

export function ResizeCheckerProvider(Private) {
  const EventEmitter = Private(EventsProvider);

  function validateElArg(el) {
    // the ResizeChecker historically accepted jquery elements,
    // so we wrap in jQuery then extract the element
    const $el = $(el);

    if ($el.size() !== 1) {
      throw new TypeError('ResizeChecker must be constructed with a single DOM element.');
    }

    return $el.get(0);
  }

  function getSize(el) {
    return [el.clientWidth, el.clientHeight];
  }

  /**
   *  ResizeChecker receives an element and emits a "resize"
   *  event every time it changes size. Used by the vislib to re-render
   *  visualizations on resize as well as the console for the
   *  same reason, but for the editors.
   */
  return class ResizeChecker extends EventEmitter {
    constructor(el) {
      super();

      this._el = validateElArg(el);

      // the width and height of the element that we expect to see
      // on the next resize notification. If it matches the size at
      // the time of the notifications then it we will be ignored.
      this._expectedSize = getSize(this._el);

      this._observer = new ResizeObserver(() => {
        if (this._expectedSize) {
          const sameSize = isEqual(getSize(this._el), this._expectedSize);
          this._expectedSize = null;

          if (sameSize) {
            // don't trigger resize notification if the size is what we expect
            return;
          }
        }

        this.emit('resize');
      });

      this._observer.observe(this._el);
    }

    /**
     *  Run a function and ignore all resizes that occur
     *  while it's running.
     *
     *  @return {undefined}
     */
    modifySizeWithoutTriggeringResize(block) {
      try {
        block();
      } finally {
        this._expectedSize = getSize(this._el);
      }
    }

    /**
    * Tell the ResizeChecker to shutdown, stop listenings, and never
    * emit another resize event.
    *
    * Cleans up it's listeners and timers.
    *
    * @method destroy
    * @return {void}
    */
    destroy() {
      if (this._destroyed) return;
      this._destroyed = true;

      this._observer.disconnect();
      this._observer = null;
      this._expectedSize = null;
      this._el = null;
      this.removeAllListeners();
    }
  };
}
