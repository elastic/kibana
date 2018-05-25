import { Request, RequestStatistics, RequestStatus, Response } from './types';

/**
 * An API to specify information about a specific request that will be logged.
 * Create a new instance to log a request using {@link RequestAdapter#start}.
 */
export class RequestResponder {
  private readonly request: Request;
  private readonly onChange: () => void;

  constructor(request: Request, onChange: () => void) {
    this.request = request;
    this.onChange = onChange;
  }

  public json(reqJson: object): RequestResponder {
    this.request.json = reqJson;
    this.onChange();
    return this;
  }

  public stats(stats: RequestStatistics): RequestResponder {
    this.request.stats = {
      ...(this.request.stats || {}),
      ...stats,
    };
    this.onChange();
    return this;
  }

  public finish(status: RequestStatus, response: Response): void {
    this.request.time = Date.now() - this.request.startTime;
    this.request.status = status;
    this.request.response = response;
    this.onChange();
  }

  public ok(response: Response): void {
    this.finish(RequestStatus.OK, response);
  }

  public error(response: Response): void {
    this.finish(RequestStatus.ERROR, response);
  }
}
