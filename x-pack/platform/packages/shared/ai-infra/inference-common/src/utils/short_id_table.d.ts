/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export declare class ShortIdTable {
  private byShortId;
  private byOriginalId;
  constructor();
  take(originalId: string): string;
  lookup(shortId: string): string | undefined;
}
