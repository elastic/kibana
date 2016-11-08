import _ from 'lodash';
import BaseObject from 'ui/utils/base_object';

/**
 * Simple event emitter class used in the vislib. Calls
 * handlers synchronously and implements a chainable api
 *
 * @class
 */
_.class(SimpleEmitter).inherits(BaseObject);
function SimpleEmitter() {
  this._listeners = {};
}

/**
 * Add an event handler
 *
 * @param  {string} name
 * @param  {function} handler
 * @return {SimpleEmitter} - this, for chaining
 */
SimpleEmitter.prototype.on = function (name, handler) {
  let handlers = this._listeners[name];
  if (!handlers) handlers = this._listeners[name] = [];

  handlers.push(handler);

  return this;
};

/**
 * Remove an event handler
 *
 * @param  {string} name
 * @param  {function} [handler] - optional handler to remove, if no handler is
 *                              passed then all are removed
 * @return {SimpleEmitter} - this, for chaining
 */
SimpleEmitter.prototype.off = function (name, handler) {
  if (!this._listeners[name]) {
    return this;
  }

  // remove a specific handler
  if (handler) _.pull(this._listeners[name], handler);
  // or remove all listeners
  else this._listeners[name] = null;

  return this;
};

/**
 * Remove all event listeners bound to this emitter.
 *
 * @return {SimpleEmitter} - this, for chaining
 */
SimpleEmitter.prototype.removeAllListeners = function () {
  this._listeners = {};
  return this;
};

/**
 * Emit an event and all arguments to all listeners for an event name
 *
 * @param  {string} name
 * @param  {*} [arg...] - any number of arguments that will be applied to each handler
 * @return {SimpleEmitter} - this, for chaining
 */
SimpleEmitter.prototype.emit = _.restParam(function (name, args) {
  if (!this._listeners[name]) return this;
  const listeners = this.listeners(name);
  let i = -1;

  while (++i < listeners.length) {
    listeners[i].apply(this, args);
  }

  return this;
});

/**
 * Get a list of the event names that currently have listeners
 *
 * @return {array[string]}
 */
SimpleEmitter.prototype.activeEvents = function () {
  return _.reduce(this._listeners, function (active, listeners, name) {
    return active.concat(_.size(listeners) ? name : []);
  }, []);
};

/**
 * Get a list of the handler functions for a specific event
 *
 * @param  {string} name
 * @return {array[function]}
 */
SimpleEmitter.prototype.listeners = function (name) {
  return this._listeners[name] ? this._listeners[name].slice(0) : [];
};

/**
 * Get the count of handlers for a specific event
 *
 * @param  {string} [name] - optional event name to filter by
 * @return {number}
 */
SimpleEmitter.prototype.listenerCount = function (name) {
  if (name) {
    return _.size(this._listeners[name]);
  }

  return _.reduce(this._listeners, function (count, handlers) {
    return count + _.size(handlers);
  }, 0);
};


export default SimpleEmitter;
