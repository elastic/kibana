/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState, useRef } from 'react';
import type { VersionedAttachment } from '@kbn/onechat-common/attachments';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { useOnechatServices } from './use_onechat_service';
import { openAttachmentViewerFlyout } from '../../flyout/open_attachment_viewer_flyout';
import type { AttachmentViewerFlyoutRef } from '../../flyout/open_attachment_viewer_flyout';

export interface UseAttachmentViewerOptions {
  /** All attachments available in the current context */
  attachments?: VersionedAttachment[];
  /** Callback when an attachment is updated. Returns updated attachment. */
  onUpdate?: (attachmentId: string, content: unknown, description?: string) => Promise<VersionedAttachment>;
  /** Callback when an attachment is renamed. Returns updated attachment. */
  onRename?: (attachmentId: string, description: string) => Promise<VersionedAttachment>;
}

export interface UseAttachmentViewerReturn {
  /** Opens the attachment viewer flyout */
  openViewer: (attachmentId: string, version?: number) => void;
  /** Closes the viewer if open */
  closeViewer: () => void;
  /** Whether the viewer is currently open */
  isViewerOpen: boolean;
  /** Current attachment ID being viewed */
  currentAttachmentId: string | null;
}

/**
 * Hook for managing the attachment viewer flyout.
 *
 * @example
 * ```tsx
 * const { openViewer, closeViewer, isViewerOpen } = useAttachmentViewer({
 *   attachments: conversation.attachments,
 *   onUpdate: handleUpdateAttachment,
 * });
 *
 * // Open viewer for a specific attachment
 * openViewer('attachment-id');
 *
 * // Open at specific version
 * openViewer('attachment-id', 2);
 * ```
 */
export function useAttachmentViewer({
  attachments,
  onUpdate,
  onRename,
}: UseAttachmentViewerOptions): UseAttachmentViewerReturn {
  const kibana = useKibana<CoreStart>();
  const services = useOnechatServices();

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentAttachmentId, setCurrentAttachmentId] = useState<string | null>(null);
  const flyoutRef = useRef<AttachmentViewerFlyoutRef | null>(null);

  // Close handler
  const closeViewer = useCallback(() => {
    flyoutRef.current?.close();
    flyoutRef.current = null;
    setIsViewerOpen(false);
    setCurrentAttachmentId(null);
  }, []);

  // Open handler
  const openViewer = useCallback(
    (attachmentId: string, version?: number) => {
      // Find the attachment
      const attachment = attachments?.find((a) => a.id === attachmentId);
      if (!attachment || !kibana.services) return;

      // Close existing viewer if open
      if (flyoutRef.current) {
        flyoutRef.current.close();
      }

      // Open new viewer
      const { flyoutRef: newRef } = openAttachmentViewerFlyout(
        {
          attachment,
          initialVersion: version,
          onClose: () => {
            setIsViewerOpen(false);
            setCurrentAttachmentId(null);
            flyoutRef.current = null;
          },
          onUpdate,
          onRename,
        },
        {
          coreStart: kibana.services as CoreStart,
          services,
        }
      );

      flyoutRef.current = newRef;
      setIsViewerOpen(true);
      setCurrentAttachmentId(attachmentId);
    },
    [attachments, kibana.services, services, onUpdate, onRename]
  );

  return {
    openViewer,
    closeViewer,
    isViewerOpen,
    currentAttachmentId,
  };
}
