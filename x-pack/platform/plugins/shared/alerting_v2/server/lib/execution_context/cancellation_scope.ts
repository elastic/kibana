/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type Disposer = () => void | Promise<void>;

export class CancellationScope {
  private readonly disposers: Disposer[] = [];

  public add(disposer: Disposer): void {
    this.disposers.push(disposer);
  }

  public async disposeAll(): Promise<void> {
    let firstError: unknown;

    while (this.disposers.length > 0) {
      const disposer = this.disposers.pop();

      if (!disposer) {
        continue;
      }

      try {
        await disposer();
      } catch (error) {
        firstError ??= error;
      }
    }

    if (firstError) {
      throw firstError;
    }
  }
}
