import $ from 'jquery';
import _ from 'lodash';
import { sequencer } from 'ui/utils/sequencer';
import { EventsProvider } from 'ui/events';
import { ReflowWatcherProvider } from 'ui/reflow_watcher';

export function ResizeCheckerProvider(Private, Notifier) {

  const EventEmitter = Private(EventsProvider);
  const reflowWatcher = Private(ReflowWatcherProvider);

  const SCHEDULE = ResizeChecker.SCHEDULE = sequencer.createEaseIn(
    100,      // shortest delay
    10000,  // longest delay
    50     // tick count
  );

  // maximum ms that we can delay emitting 'resize'. This is only used
  // to debounce resizes when the size of the element is constantly changing
  const MS_MAX_RESIZE_DELAY = ResizeChecker.MS_MAX_RESIZE_DELAY = 500;

  /**
   * Checks the size of an element on a regular basis. Provides
   * an event that is emited when the element has changed size.
   *
   * @class ResizeChecker
   * @param {HtmlElement} el - the element to track the size of
   */
  _.class(ResizeChecker).inherits(EventEmitter);
  function ResizeChecker(el) {
    ResizeChecker.Super.call(this);

    this.$el = $(el);
    this.notify = new Notifier({ location: 'Vislib ResizeChecker ' + _.uniqueId() });

    this.saveSize();

    this.check = _.bind(this.check, this);
    this.check();

    this.onReflow = _.bind(this.onReflow, this);
    reflowWatcher.on('reflow', this.onReflow);
  }

  ResizeChecker.prototype.onReflow = function () {
    this.startSchedule(SCHEDULE);
  };

  /**
   * Read the size of the element
   *
   * @method read
   * @return {object} - an object with keys `w` (width) and `h` (height)
   */
  ResizeChecker.prototype.read = function () {
    return {
      w: this.$el[0].clientWidth,
      h: this.$el[0].clientHeight
    };
  };


  /**
   * Save the element size, preventing it from being considered as an
   * update.
   *
   * @method save
   * @param  {object} [size] - optional size to save, otherwise #read() is called
   * @return {boolean} - true if their was a change in the new
   */
  ResizeChecker.prototype.saveSize = function (size) {
    if (!size) size = this.read();

    if (this._equalsSavedSize(size)) {
      return false;
    }

    this._savedSize = size;
    return true;
  };


  /**
   * Determine if a given size matches the currently saved size.
   *
   * @private
   * @method _equalsSavedSize
   * @param  {object} a - an object that matches the return value of #read()
   * @return {boolean} - true if the passed in value matches the saved size
   */
  ResizeChecker.prototype._equalsSavedSize = function (a) {
    const b = this._savedSize || {};
    return a.w === b.w && a.h === b.h;
  };

  /**
   * Read the time that the dirty state last changed.
   *
   * @method lastDirtyChange
   * @return {timestamp} - the unix timestamp (in ms) of the last update
   *                       to the dirty state
   */
  ResizeChecker.prototype.lastDirtyChange = function () {
    return this._dirtyChangeStamp;
  };

  /**
   * Record the dirty state
   *
   * @method saveDirty
   * @param  {boolean} val
   * @return {boolean} - true if the dirty state changed by this save
   */
  ResizeChecker.prototype.saveDirty = function (val) {
    val = !!val;

    if (val === this._isDirty) return false;

    this._isDirty = val;
    this._dirtyChangeStamp = Date.now();
    return true;
  };

  /**
   * The check routine that executes regularly and will reschedule itself
   * to run again in the future. It determines the state of the elements
   * size and decides when to emit the "update" event.
   *
   * @method check
   * @return {void}
   */
  ResizeChecker.prototype.check = function () {
    const newSize = this.read();
    const dirty = this.saveSize(newSize);
    const dirtyChanged = this.saveDirty(dirty);

    const doneDirty = !dirty && dirtyChanged;
    const muchDirty = dirty && (this.lastDirtyChange() - Date.now() > MS_MAX_RESIZE_DELAY);
    if (doneDirty || muchDirty) {
      this.emit('resize', newSize);
    }

    // if the dirty state is unchanged, continue using the previous schedule
    if (!dirtyChanged) {
      return this.continueSchedule();
    }

    return this.startSchedule(SCHEDULE);
  };

  /**
   * Start running a new schedule, using one of the SCHEDULE_* constants.
   *
   * @method startSchedule
   * @param  {integer[]} schedule - an array of millisecond times that should
   *                              be used to schedule calls to #check();
   * @return {integer} - the id of the next timer
   */
  ResizeChecker.prototype.startSchedule = function (schedule) {
    this._tick = -1;
    this._currentSchedule = schedule;
    return this.continueSchedule();
  };

  /**
   * Continue running the current schedule. MUST BE CALLED AFTER #startSchedule()
   *
   * @method continueSchedule
   * @return {integer} - the id of the next timer
   */
  ResizeChecker.prototype.continueSchedule = function () {
    clearTimeout(this._timerId);

    if (this._tick < this._currentSchedule.length - 1) {
      // at the end of the schedule, don't progress any further but repeat the last value
      this._tick += 1;
    }

    const check = this.check; // already bound
    const ms = this._currentSchedule[this._tick];
    return (this._timerId = setTimeout(function () {
      check();
    }, ms));
  };

  ResizeChecker.prototype.stopSchedule = function () {
    clearTimeout(this._timerId);
  };

  /**
   * Signal that the ResizeChecker should shutdown.
   *
   * Cleans up it's listeners and timers.
   *
   * @method destroy
   * @return {void}
   */
  ResizeChecker.prototype.destroy = function () {
    reflowWatcher.off('reflow', this.onReflow);
    clearTimeout(this._timerId);
  };

  return ResizeChecker;
}
