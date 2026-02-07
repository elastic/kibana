/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type {
  DashboardAttachmentData,
  PanelAddedEventData,
  AttachmentPanel,
} from '@kbn/dashboard-agent-common';

export interface AttachmentState {
  attachmentId: string;
  data: DashboardAttachmentData;
}

export type OpenFlyoutCallback = (attachmentId: string, data: DashboardAttachmentData) => void;

/**
 * Simple store for managing the currently active dashboard attachment.
 * Used to sync attachment updates between the plugin and the flyout.
 */
export class AttachmentStore {
  private readonly state$ = new BehaviorSubject<AttachmentState | null>(null);
  private openFlyoutCallback?: OpenFlyoutCallback;

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
   * Check if flyout is currently open.
   */
  isFlyoutOpen(): boolean {
    return this.state$.getValue() !== null;
  }

  /**
   * Register a callback to open the flyout when an update arrives and flyout is closed.
   */
  registerOpenFlyoutCallback(callback: OpenFlyoutCallback): void {
    this.openFlyoutCallback = callback;
  }

  /**
   * Set the current attachment being viewed in the flyout.
   */
  setAttachment(attachmentId: string, data: DashboardAttachmentData): void {
    this.state$.next({ attachmentId, data });
  }

  /**
   * Update the attachment data. If flyout is open and matches, update it.
   * If flyout is closed, open it with the new data.
   */
  updateAttachment(attachmentId: string, data: DashboardAttachmentData): void {
    const current = this.state$.getValue();
    console.log('AttachmentStore.updateAttachment:', {
      incomingId: attachmentId,
      currentId: current?.attachmentId,
      isFlyoutOpen: current !== null,
    });

    if (current?.attachmentId === attachmentId) {
      // Flyout is open with this attachment - update it
      console.log('AttachmentStore: emitting new state');
      this.state$.next({ attachmentId, data });
    } else if (current === null && this.openFlyoutCallback) {
      // Flyout is closed - open it with the new data
      console.log('AttachmentStore: flyout closed, opening with new data');
      this.openFlyoutCallback(attachmentId, data);
    }
  }

  /**
   * Add a panel progressively to the current attachment.
   * If no flyout is open, opens it with a new dashboard containing this panel.
   */
  addPanel(attachmentId: string, panel: PanelAddedEventData['panel']): void {
    const current = this.state$.getValue();
    console.log('AttachmentStore.addPanel:', {
      incomingId: attachmentId,
      currentId: current?.attachmentId,
      panelId: panel.panelId,
    });

    // Convert UI event panel to AttachmentPanel format
    const attachmentPanel: AttachmentPanel = {
      type: 'lens',
      panelId: panel.panelId,
      visualization: panel.visualization,
      title: panel.title,
    };

    if (current?.attachmentId === attachmentId) {
      // Flyout is open with this attachment - add panel to it
      const updatedData: DashboardAttachmentData = {
        ...current.data,
        panels: [...current.data.panels, attachmentPanel],
      };
      console.log('AttachmentStore: adding panel to existing flyout');
      this.state$.next({ attachmentId, data: updatedData });
    } else if (current === null && this.openFlyoutCallback) {
      // Flyout is closed - open it with a new dashboard containing this panel
      const newData: DashboardAttachmentData = {
        title: 'Dashboard',
        description: '',
        panels: [attachmentPanel],
      };
      console.log('AttachmentStore: opening flyout with new panel');
      this.openFlyoutCallback(attachmentId, newData);
    }
  }

  /**
   * Remove a panel progressively from the current attachment.
   */
  removePanel(attachmentId: string, panelId: string): void {
    const current = this.state$.getValue();
    console.log('AttachmentStore.removePanel:', {
      incomingId: attachmentId,
      currentId: current?.attachmentId,
      panelId,
    });

    if (current?.attachmentId === attachmentId) {
      const updatedData: DashboardAttachmentData = {
        ...current.data,
        panels: current.data.panels.filter((p) => p.panelId !== panelId),
      };
      console.log('AttachmentStore: removing panel from flyout');
      this.state$.next({ attachmentId, data: updatedData });
    }
  }

  /**
   * Clear the current attachment (e.g., when flyout closes).
   */
  clear(): void {
    this.state$.next(null);
  }
}
