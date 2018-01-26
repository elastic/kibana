import $ from 'jquery';
import ResizeObserver from 'resize-observer-polyfill';
import { isEqual } from 'lodash';
import EventEmitter from 'events';


function validateElArg(el) {
  // the ResizeChecker historically accepted jquery elements,
  // so we wrap in jQuery then extract the element
  const $el = $(el);

  if ($el.length !== 1) {
    throw new TypeError('ResizeChecker must be constructed with a single DOM element.');
  }

  return $el.get(0);
}

function getSize(el) {
  return [el.clientWidth, el.clientHeight];
}

/**
 *  ResizeChecker receives an element and emits a "resize" event every time it changes size.
 */
export class ResizeChecker extends EventEmitter {
  constructor(el, args = {}) {
    super();

    this._el = validateElArg(el);

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

    // Only enable the checker immediately if args.disabled wasn't set to true
    if (!args.disabled) {
      this.enable();
    }
  }

  enable() {
    if (this._destroyed) {
      // Don't allow enabling an already destroyed resize checker
      return;
    }
    // the width and height of the element that we expect to see
    // on the next resize notification. If it matches the size at
    // the time of starting observing then it we will be ignored.
    this._expectedSize = getSize(this._el);
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
}
