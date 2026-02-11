/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { isLensAttachmentPanel } from '@kbn/dashboard-agent-common';
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

/** Event types emitted by the AttachmentStore */
export type AttachmentStoreEvent =
  | { type: 'attachment_updated'; attachmentId: string; data: DashboardAttachmentData }
  | { type: 'panel_added'; attachmentId: string; data: DashboardAttachmentData }
  | { type: 'panels_removed'; attachmentId: string; data: DashboardAttachmentData };

export type AttachmentStoreListener = (event: AttachmentStoreEvent) => void;

/**
 * Store for managing dashboard attachment state.
 * Emits events when attachments are updated, allowing multiple listeners to react.
 */
export class AttachmentStore {
  private readonly state$ = new BehaviorSubject<AttachmentState | null>(null);
  private readonly listeners = new Set<AttachmentStoreListener>();
  private attachmentCache = new Map<string, DashboardAttachmentData>();

  /**
   * Observable of the current attachment state.
   */
  public get state() {
    return this.state$.asObservable();
  }

  /**
   * Get the current attachment state synchronously.
   */
  getState(): AttachmentState | null {
    return this.state$.getValue();
  }

  /**
   * Register a listener to receive events from the store.
   * Returns an unsubscribe function.
   */
  addListener(listener: AttachmentStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: AttachmentStoreEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Set the current attachment state.
   */
  setAttachment(attachmentId: string, data: DashboardAttachmentData): void {
    this.attachmentCache.set(attachmentId, data);
    this.state$.next({ attachmentId, data, isConfirmed: true });
  }

  /**
   * Update the attachment data and emit event for listeners.
   */
  updateAttachment(attachmentId: string, data: DashboardAttachmentData): void {
    this.attachmentCache.set(attachmentId, data);
    this.state$.next({ attachmentId, data, isConfirmed: true });
    this.emit({ type: 'attachment_updated', attachmentId, data });
  }

  /**
   * Add a panel progressively to the attachment.
   */
  addPanel(attachmentId: string, panel: PanelAddedEventData['panel']): void {
    const attachmentPanel: AttachmentPanel = isLensAttachmentPanel(panel)
      ? {
          type: 'lens',
          panelId: panel.panelId,
          visualization: panel.visualization,
          title: panel.title,
        }
      : panel;

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

    this.attachmentCache.set(attachmentId, updatedData);
    this.state$.next({ attachmentId, data: updatedData, isConfirmed: false });
    this.emit({ type: 'panel_added', attachmentId, data: updatedData });
  }

  /**
   * Remove panels from the attachment.
   */
  removePanels(attachmentId: string, panelIds: string[]): void {
    const cachedData = this.attachmentCache.get(attachmentId);
    if (!cachedData) return;

    const updatedData: DashboardAttachmentData = {
      ...cachedData,
      panels: cachedData.panels.filter((p) => !panelIds.includes(p.panelId)),
    };

    this.attachmentCache.set(attachmentId, updatedData);
    this.state$.next({ attachmentId, data: updatedData, isConfirmed: false });
    this.emit({ type: 'panels_removed', attachmentId, data: updatedData });
  }
}
