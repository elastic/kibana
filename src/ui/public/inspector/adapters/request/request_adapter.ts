import { EventEmitter } from 'events';
import { RequestResponder } from './request_responder';
import { Request, RequestParams, RequestStatus } from './types';

/**
 * An generic inspector adapter to log requests.
 * These can be presented in the inspector using the requests view.
 * The adapter is not coupled to a specific implementation or even Elasticsearch
 * instead it offers a generic API to log requests of any kind.
 * @extends EventEmitter
 */
class RequestAdapter extends EventEmitter {
  private requests: Request[] = [];

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
  public start(name: string, params: RequestParams = {}): RequestResponder {
    const req: Request = {
      ...params,
      name,
      startTime: Date.now(),
      status: RequestStatus.PENDING,
    };
    this.requests.push(req);
    this._onChange();
    return new RequestResponder(req, () => this._onChange());
  }

  public reset(): void {
    this.requests = [];
    this._onChange();
  }

  public getRequests(): Request[] {
    return this.requests;
  }

  private _onChange(): void {
    this.emit('change');
  }
}

export { RequestAdapter };
