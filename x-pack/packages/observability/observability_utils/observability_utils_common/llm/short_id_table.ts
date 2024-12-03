/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

function generateShortId(size: number): string {
  let id = '';
  let i = size;
  while (i--) {
    const index = Math.floor(Math.random() * ALPHABET.length);
    id += ALPHABET[index];
  }
  return id;
}

const MAX_ATTEMPTS_AT_LENGTH = 100;

export class ShortIdTable {
  private byShortId: Map<string, string> = new Map();
  private byOriginalId: Map<string, string> = new Map();

  constructor() {}

  take(originalId: string) {
    if (this.byOriginalId.has(originalId)) {
      return this.byOriginalId.get(originalId)!;
    }

    let uniqueId: string | undefined;
    let attemptsAtLength = 0;
    let length = 4;
    while (!uniqueId) {
      const nextId = generateShortId(length);
      attemptsAtLength++;
      if (!this.byShortId.has(nextId)) {
        uniqueId = nextId;
      } else if (attemptsAtLength >= MAX_ATTEMPTS_AT_LENGTH) {
        attemptsAtLength = 0;
        length++;
      }
    }

    this.byShortId.set(uniqueId, originalId);
    this.byOriginalId.set(originalId, uniqueId);

    return uniqueId;
  }

  lookup(shortId: string) {
    return this.byShortId.get(shortId);
  }
}
