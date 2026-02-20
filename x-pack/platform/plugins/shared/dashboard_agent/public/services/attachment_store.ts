/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
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

/** Event types emitted by the DashboardAttachmentStore */
export type AttachmentStoreEvent =
  | { type: 'attachment_updated'; attachmentId: string; data: DashboardAttachmentData }
  | { type: 'panel_added'; attachmentId: string; data: DashboardAttachmentData }
  | { type: 'panels_removed'; attachmentId: string; data: DashboardAttachmentData };

export type AttachmentStoreListener = (event: AttachmentStoreEvent) => void;

/**
 * Store for managing dashboard attachment state.
 * Emits events when attachments are updated, allowing multiple listeners to react.
 */
export class DashboardAttachmentStore {
  private readonly _state$ = new BehaviorSubject<AttachmentState | null>(null);
  private readonly listeners = new Set<AttachmentStoreListener>();
  private attachmentCache = new Map<string, DashboardAttachmentData>();

  /**
   * Observable of the current attachment state.
   */
  public readonly state$: Observable<AttachmentState | null> = this._state$.asObservable();

  /**
   * Get the current attachment state synchronously.
   */
  getState(): AttachmentState | null {
    return this._state$.getValue();
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

  private commitState({
    attachmentId,
    data,
    isConfirmed,
    eventType,
  }: {
    attachmentId: string;
    data: DashboardAttachmentData;
    isConfirmed: boolean;
    eventType?: AttachmentStoreEvent['type'];
  }): void {
    this.attachmentCache.set(attachmentId, data);
    this._state$.next({ attachmentId, data, isConfirmed });

    if (eventType) {
      this.emit({ type: eventType, attachmentId, data });
    }
  }

  /**
   * Set the current attachment state.
   */
  setAttachment(attachmentId: string, data: DashboardAttachmentData): void {
    this.commitState({ attachmentId, data, isConfirmed: true });
  }

  /**
   * Update the attachment data and emit event for listeners.
   */
  updateAttachment(attachmentId: string, data: DashboardAttachmentData): void {
    this.commitState({
      attachmentId,
      data,
      isConfirmed: true,
      eventType: 'attachment_updated',
    });
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

    const existingPanelIndex = baseData.panels.findIndex(
      ({ panelId: existingPanelId }) => existingPanelId === attachmentPanel.panelId
    );
    // TODO: Temporary logic for updating panels (currently just the markdown panel)
    const panels =
      existingPanelIndex === -1
        ? [...baseData.panels, attachmentPanel]
        : baseData.panels.map((existingPanel, index) =>
            index === existingPanelIndex ? attachmentPanel : existingPanel
          );

    const updatedData: DashboardAttachmentData = {
      ...baseData,
      panels,
    };

    this.commitState({
      attachmentId,
      data: updatedData,
      isConfirmed: false,
      eventType: 'panel_added',
    });
  }

  /**
   * Remove panels from the attachment.
   */
  removePanels(attachmentId: string, panelIds: string[]): void {
    const cachedData = this.attachmentCache.get(attachmentId);
    if (!cachedData) return;
    if (panelIds.length === 0) return;

    const panelIdSet = new Set(panelIds);
    const panels = cachedData.panels.filter((p) => !panelIdSet.has(p.panelId));
    if (panels.length === cachedData.panels.length) return;

    const updatedData: DashboardAttachmentData = {
      ...cachedData,
      panels,
    };

    this.commitState({
      attachmentId,
      data: updatedData,
      isConfirmed: false,
      eventType: 'panels_removed',
    });
  }
}
