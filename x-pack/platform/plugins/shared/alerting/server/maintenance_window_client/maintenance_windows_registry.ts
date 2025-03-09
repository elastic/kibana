/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindow } from '../application/maintenance_window/types';

export type CallbackType = 'post_save' | 'post_delete' | 'post_update';
export interface CallbackEvent {
  type: CallbackType;
  data: MaintenanceWindow | string;
}
class MaintenanceWindowRegistry {
  private callbacks: Record<string, Array<(data: CallbackEvent) => Promise<void>>> = {};

  register(eventType: CallbackType, callback: (event: { type: CallbackType }) => Promise<void>) {
    if (!this.callbacks[eventType]) {
      this.callbacks[eventType] = [];
    }
    this.callbacks[eventType].push(callback);
  }

  async trigger(event: CallbackEvent) {
    if (this.callbacks[event.type]) {
      await Promise.all(this.callbacks[event.type].map(async (cb) => cb(event)));
    }
  }
}

export const maintenanceWindowRegistry = new MaintenanceWindowRegistry();
