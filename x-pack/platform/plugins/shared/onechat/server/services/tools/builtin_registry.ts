/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { Tool } from '@kbn/onechat-server';

export type ToolRegistrationFn = () => MaybePromise<Tool[]>;
export type ToolDirectRegistration = Tool;

export type ToolRegistration = ToolDirectRegistration | ToolRegistrationFn;

export const isToolRegistrationFn = (tool: ToolRegistration): tool is ToolRegistrationFn => {
  return typeof tool === 'function';
};

export const wrapToolRegistration = (tool: ToolDirectRegistration): ToolRegistrationFn => {
  return () => {
    return [tool];
  };
};

export class BuiltinToolRegistry {
  private registrations: ToolRegistrationFn[] = [];

  constructor() {}

  register(registration: ToolRegistration) {
    if (isToolRegistrationFn(registration)) {
      this.registrations.push(registration);
    } else {
      this.registrations.push(wrapToolRegistration(registration));
    }
  }
}
