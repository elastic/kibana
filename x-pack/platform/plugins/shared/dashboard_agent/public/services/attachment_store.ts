/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { DashboardAttachmentData } from '@kbn/dashboard-agent-common';

export interface AttachmentState {
  attachmentId: string;
  data: DashboardAttachmentData;
}

/**
 * Simple store for managing the currently active dashboard attachment.
 * Used to sync attachment updates between the plugin and the flyout.
 */
export class AttachmentStore {
  private readonly state$ = new BehaviorSubject<AttachmentState | null>(null);

  /**
   * Observable of the current attachment state.
   */
  get state() {
    return this.state$.asObservable();
  }

  /**
   * Get the current attachment state synchronously.
   */
  getState(): AttachmentState | null {
    return this.state$.getValue();
  }

  /**
   * Set the current attachment being viewed in the flyout.
   */
  setAttachment(attachmentId: string, data: DashboardAttachmentData): void {
    this.state$.next({ attachmentId, data });
  }

  /**
   * Update the attachment data if it matches the current attachment ID.
   */
  updateAttachment(attachmentId: string, data: DashboardAttachmentData): void {
    const current = this.state$.getValue();
    console.log('AttachmentStore.updateAttachment:', {
      incomingId: attachmentId,
      currentId: current?.attachmentId,
      matches: current?.attachmentId === attachmentId,
    });
    if (current?.attachmentId === attachmentId) {
      console.log('AttachmentStore: emitting new state');
      this.state$.next({ attachmentId, data });
    }
  }

  /**
   * Clear the current attachment (e.g., when flyout closes).
   */
  clear(): void {
    this.state$.next(null);
  }
}
