import EventEmitter from 'events';

const RequestStatus = {
  OK: 'ok',
  ERROR: 'error'
};

/**
 * An API to specify information about a specific request that will be logged.
 * Create a new instance to log a request using {@link RequestAdapter#start}.
 */
class RequestResponder {
  constructor(request, logger) {
    this._request = request;
    this._logger = logger;
  }

  json(reqJson) {
    this._request.json = reqJson;
    this._logger._onChange();
    return this;
  }

  stats(stats) {
    this._request.stats = {
      ...(this._request.stats || {}),
      ...stats
    };
    this._logger._onChange();
    return this;
  }

  finish(status, data) {
    const time = Date.now() - this._request._startTime;
    this._request.time = time;
    this._request.response = {
      ...data,
      status: status,
    };
    this._logger._onChange();
  }

  ok(...args) {
    this.finish(RequestStatus.OK, ...args);
  }

  error(...args) {
    this.finish(RequestStatus.ERROR, ...args);
  }
}

/**
 * An generic inspector adapter to log requests.
 * These can be presented in the inspector using the requests view.
 * The adapter is not coupled to a specific implementation or even Elasticsearch
 * instead it offers a generic API to log requests of any kind.
 * @extends EventEmitter
 */
class RequestAdapter extends EventEmitter {

  _requests = [];

  /**
   * Start logging a new request into this request adapter. The new request will
   * by default be in a processing state unless you explicitly finish it via
   * {@link RequestResponder#finish}, {@link RequestResponder#ok} or
   * {@link RequestResponder#error}.
   *
   * @param  {string} name The name of this request as it should be shown in the UI.
   * @param  {object} args Additional arguments for the request.
   * @return {RequestResponder} An instance to add information to the request and finish it.
   */
  start(name, args) {
    const req = {
      ...args,
      name,
    };
    req._startTime = Date.now();
    this._requests.push(req);
    this._onChange();
    return new RequestResponder(req, this);
  }

  reset() {
    this._requests = [];
    this._onChange();
  }

  getRequests() {
    return this._requests;
  }

  _onChange() {
    this.emit('change');
  }

}

export { RequestAdapter, RequestStatus };
