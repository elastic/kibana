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
  /** True when this state came from a confirmed attachment update (RoundCompleteEvent) */
  isConfirmed: boolean;
}

export type OpenFlyoutCallback = (attachmentId: string, data: DashboardAttachmentData) => void;

/**
 * Simple store for managing the currently active dashboard attachment.
 * Used to sync attachment updates between the plugin and the flyout.
 */
export class AttachmentStore {
  private readonly state$ = new BehaviorSubject<AttachmentState | null>(null);
  private openFlyoutCallback?: OpenFlyoutCallback;
  // Cache of last known attachment data by ID (used when flyout is closed)
  private attachmentCache = new Map<string, DashboardAttachmentData>();

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
   * Also caches the data so it's available if flyout closes and reopens.
   */
  setAttachment(attachmentId: string, data: DashboardAttachmentData): void {
    // Cache the data so it's available when flyout is closed
    this.attachmentCache.set(attachmentId, data);
    this.state$.next({ attachmentId, data, isConfirmed: true });
  }

  /**
   * Update the attachment data. If flyout is open and matches, update it.
   * If flyout is closed, open it with the new data.
   * Also caches the data for future use when flyout is closed.
   */
  updateAttachment(attachmentId: string, data: DashboardAttachmentData): void {
    // Always cache the latest data
    this.attachmentCache.set(attachmentId, data);
    console.log('AttachmentStore: cached attachment data', {
      attachmentId,
      panelCount: data.panels.length,
      cacheSize: this.attachmentCache.size,
    });

    const current = this.state$.getValue();
    console.log('AttachmentStore.updateAttachment:', {
      incomingId: attachmentId,
      currentId: current?.attachmentId,
      isFlyoutOpen: current !== null,
    });

    if (current?.attachmentId === attachmentId) {
      // Flyout is open with this attachment - update it
      console.log('AttachmentStore: emitting new state');
      this.state$.next({ attachmentId, data, isConfirmed: true });
    } else if (current === null && this.openFlyoutCallback) {
      // Flyout is closed - open it with the new data
      console.log('AttachmentStore: flyout closed, opening with new data');
      this.openFlyoutCallback(attachmentId, data);
    }
  }

  /**
   * Add a panel progressively to the current attachment.
   * If no flyout is open, opens it with cached data plus the new panel.
   */
  addPanel(attachmentId: string, panel: PanelAddedEventData['panel']): void {
    const current = this.state$.getValue();
    console.log('AttachmentStore.addPanel:', {
      incomingId: attachmentId,
      currentId: current?.attachmentId,
      panelId: panel.panelId,
      hasCachedData: this.attachmentCache.has(attachmentId),
      cachedKeys: Array.from(this.attachmentCache.keys()),
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
      // Update cache with new state
      this.attachmentCache.set(attachmentId, updatedData);
      console.log('AttachmentStore: adding panel to existing flyout');
      this.state$.next({ attachmentId, data: updatedData, isConfirmed: false });
    } else if (current === null && this.openFlyoutCallback) {
      // Flyout is closed - use cached data if available, otherwise create new
      const cachedData = this.attachmentCache.get(attachmentId);
      const baseData: DashboardAttachmentData = cachedData ?? {
        title: 'Dashboard',
        description: '',
        panels: [],
      };
      const updatedData: DashboardAttachmentData = {
        ...baseData,
        panels: [...baseData.panels, attachmentPanel],
      };
      // Update cache with new state
      this.attachmentCache.set(attachmentId, updatedData);
      console.log('AttachmentStore: opening flyout with cached data + new panel', {
        cachedPanelCount: cachedData?.panels.length ?? 0,
      });
      this.openFlyoutCallback(attachmentId, updatedData);
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
      this.state$.next({ attachmentId, data: updatedData, isConfirmed: false });
    }
  }

  /**
   * Clear the current attachment (e.g., when flyout closes).
   */
  clear(): void {
    this.state$.next(null);
  }
}
