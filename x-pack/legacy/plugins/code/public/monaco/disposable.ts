/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IDisposable } from 'monaco-editor';

export abstract class Disposable implements IDisposable {
  protected disposables: IDisposable[];

  constructor() {
    this.disposables = [];
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }

  protected _register<T extends IDisposable>(t: T): T {
    this.disposables.push(t);
    return t;
  }
}
