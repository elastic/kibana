/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';

export class TelemetryConfigProvider {
  private isOptedIn$?: Observable<boolean>;
  private _isOptedIn?: boolean;

  private subscription?: Subscription;

  public start(isOptedIn$: Observable<boolean>) {
    this.isOptedIn$ = isOptedIn$;
    this.subscription = this.isOptedIn$.subscribe((isOptedIn) => {
      this._isOptedIn = isOptedIn;
    });
  }

  public stop() {
    this.subscription?.unsubscribe();
  }

  public getIsOptedIn() {
    return this._isOptedIn;
  }

  public getObservable() {
    return this.isOptedIn$;
  }
}
