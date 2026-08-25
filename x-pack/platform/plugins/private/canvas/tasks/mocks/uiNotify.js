/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const notifierProto = {
  error: (msg) => `error: ${msg}`,
  warning: (msg) => `warning: ${msg}`,
  info: (msg) => `info: ${msg}`,
};

export class Notifier {
  constructor() {
    Object.assign(this, notifierProto);
  }
}
