/**
 * The status a request can have.
 */
export enum RequestStatus {
  /**
   * The request hasn't finished yet.
   */
  PENDING,
  /**
   * The request has successfully finished.
   */
  OK,
  /**
   * The request failed.
   */
  ERROR,
}

export interface Request extends RequestParams {
  name: string;
  json?: object;
  response?: Response;
  startTime: number;
  stats?: RequestStatistics;
  status: RequestStatus;
  time?: number;
}

export interface RequestParams {
  description?: string;
}

export interface RequestStatistics {
  [key: string]: any;
}

export interface Response {
  json?: object;
}
