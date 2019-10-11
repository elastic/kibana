/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
type Resolve<T> = (t: T) => void;
type Reject = (error: any) => void;
type Cancel = (error: any) => void;
type OnCancel = (cancel: Cancel) => void;

export class Cancelable<T> {
  public readonly promise: Promise<T>;
  private resolve: Resolve<T> | undefined = undefined;
  private reject: Reject | undefined = undefined;
  private _cancel: Cancel | undefined = undefined;
  private resolved: boolean = false;

  constructor(readonly fn: (resolve: Resolve<T>, reject: Reject, onCancel: OnCancel) => void) {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    }).then((t: T) => {
      this.resolved = true;
      return t;
    });
    fn(this.resolve!, this.reject!, (cancel: Cancel) => {
      this._cancel = cancel;
    });
  }

  public cancel(error: any = 'canceled'): void {
    if (!this.resolved) {
      if (this._cancel) {
        this._cancel(error);
      } else if (this.reject) {
        this.reject(error);
      }
    }
  }

  public error(error: any) {
    if (this.reject) {
      this.reject(error);
    }
  }

  public static fromPromise<T>(promise: Promise<T>) {
    return new Cancelable((resolve, reject, c) => {
      promise.then(resolve, reject);
    });
  }
}
