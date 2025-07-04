/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Defines operation (encryption or decryption) during which error occurred.
 */
export enum EncryptionErrorOperation {
  Encryption,
  Decryption,
}

export class EncryptionError extends Error {
  constructor(
    message: string,
    public readonly attributeName: string,
    public readonly operation: EncryptionErrorOperation,
    public readonly cause?: Error
  ) {
    super(message);

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, EncryptionError.prototype);
  }

  toJSON() {
    return { message: this.message };
  }
}
