/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart, OverlayRef } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { VersionedAttachment } from '@kbn/onechat-common/attachments';
import { AttachmentViewerFlyout } from '../application/components/attachment_viewer';
import type { OnechatInternalService } from '../services';
import { OnechatServicesContext } from '../application/context/onechat_services_context';

/**
 * Options for opening the attachment viewer flyout.
 */
export interface OpenAttachmentViewerFlyoutOptions {
  /** The attachment to view */
  attachment: VersionedAttachment;
  /** Initial version to display (defaults to current_version) */
  initialVersion?: number;
  /** Callback when flyout is closed */
  onClose?: () => void;
  /** Callback when attachment is updated (creates new version). Returns updated attachment. */
  onUpdate?: (attachmentId: string, content: unknown, description?: string) => Promise<VersionedAttachment>;
  /** Callback when attachment is renamed (updates description without new version). Returns updated attachment. */
  onRename?: (attachmentId: string, description: string) => Promise<VersionedAttachment>;
}

interface OpenAttachmentViewerFlyoutParams {
  coreStart: CoreStart;
  services: OnechatInternalService;
}

/**
 * Reference to the attachment viewer flyout.
 */
export interface AttachmentViewerFlyoutRef {
  /** Close the flyout */
  close: () => void;
}

/**
 * Wrapper component that provides necessary contexts for the attachment viewer.
 */
const AttachmentViewerWrapper: React.FC<{
  coreStart: CoreStart;
  services: OnechatInternalService;
  options: OpenAttachmentViewerFlyoutOptions;
  onClose: () => void;
}> = ({ coreStart, services, options, onClose }) => {
  const { onClose: externalOnClose, ...restOptions } = options;

  const kibanaServices = {
    ...coreStart,
    plugins: {
      ...services.startDependencies,
    },
  };

  return (
    <KibanaContextProvider services={kibanaServices}>
      <I18nProvider>
        <OnechatServicesContext.Provider value={services}>
          <AttachmentViewerFlyout {...restOptions} onClose={onClose} />
        </OnechatServicesContext.Provider>
      </I18nProvider>
    </KibanaContextProvider>
  );
};

/**
 * Opens the attachment viewer flyout.
 *
 * @param options - Configuration options for the flyout
 * @param params - Internal parameters (services, core, etc.)
 * @returns Reference to the flyout for programmatic control
 */
export function openAttachmentViewerFlyout(
  options: OpenAttachmentViewerFlyoutOptions,
  { coreStart, services }: OpenAttachmentViewerFlyoutParams
): { flyoutRef: AttachmentViewerFlyoutRef } {
  const { overlays, ...startServices } = coreStart;

  let flyoutRef: OverlayRef;

  const handleOnClose = () => {
    flyoutRef?.close();
    options.onClose?.();
  };

  // Use openModal instead of openFlyout to avoid closing the parent onechat flyout
  // Modals stack on top without closing existing flyouts
  flyoutRef = overlays.openModal(
    toMountPoint(
      <AttachmentViewerWrapper
        coreStart={coreStart}
        services={services}
        options={options}
        onClose={handleOnClose}
      />,
      startServices
    ),
    {
      'data-test-subj': 'onechat-attachment-viewer-modal',
      maxWidth: 800,
    }
  );

  const attachmentViewerFlyoutRef: AttachmentViewerFlyoutRef = {
    close: () => {
      flyoutRef.close();
    },
  };

  return {
    flyoutRef: attachmentViewerFlyoutRef,
  };
}
