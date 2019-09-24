/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare interface MlMessageBarService {
  getMessages(): any[];
  addMessage(msg: any): void;
  removeMessage(index: number): void;
  clear(): void;
  info(text: any): void;
  warning(text: any): void;
  error(text: any, resp?: any): void;
  notify: {
    error(text: any, resp?: any): void;
  };
}

export const mlMessageBarService: MlMessageBarService;
