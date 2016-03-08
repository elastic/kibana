import { bindKey, reduce, size, uniq } from 'lodash';
import BaseObject from 'ui/utils/BaseObject';
import { EventEmitter } from 'events';

const emitter = Symbol('event emitter');

function proxyToEmitter(source, dest) {
  /* eslint-disable no-loop-func */
  for (const key of Object.keys(source)) {
    if (key.startsWith('_')) continue;

    if (typeof source[key] === 'function') {
      dest[key] = function (...args) {
        return source[key].apply(this[emitter], args);
      };
    } else {
      Object.defineProperty(dest, key, {
        get() { return source[key]; }
      });
    }
  }
  /* eslint-enable no-loop-func */
}

/**
 * Simple event emitter class used in the vislib. Calls
 * handlers synchronously and implements a chainable api
 *
 * @class
 */
export default class SimpleEmitter extends BaseObject {
  constructor() {
    super();

    // mixin the event emitter object
    this[emitter] = new EventEmitter();
    proxyToEmitter(this[emitter], this);
  }

  /**
  * Get a list of the event names that currently have listeners
  *
  * @return {array[string]}
  */
  activeEvents() {
    return reduce(this[emitter]._events, function (active, listeners, name) {
      return [...active, ...(size(listeners) ? name : [])];
    }, []);
  }
}

proxyToEmitter(EventEmitter.prototype, SimpleEmitter.prototype);
