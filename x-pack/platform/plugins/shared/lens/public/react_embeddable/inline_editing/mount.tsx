/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { TracksOverlays } from '@kbn/presentation-containers';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import ReactDOM from 'react-dom';

/**
 * Shared logic to mount the inline config panel
 * @param ConfigPanel
 * @param coreStart
 * @param overlayTracker
 * @param uuid
 * @param container
 */
export function mountInlinePanel(
  InlinePanel: JSX.Element,
  coreStart: CoreStart,
  overlayTracker: TracksOverlays | undefined,
  {
    container,
    dataTestSubj,
    uuid,
  }: {
    dataTestSubj?: string;
    uuid?: string;
    container?: HTMLElement | null;
  } = {}
) {
  const dataTestSubjFinal = dataTestSubj ?? 'customizeLens';
  if (container) {
    ReactDOM.render(InlinePanel, container);
  } else {
    const handle = coreStart.overlays.openFlyout(
      toMountPoint(
        React.cloneElement(InlinePanel, {
          closeFlyout: () => {
            overlayTracker?.clearOverlays();
            handle.close();
          },
        }),
        coreStart
      ),
      {
        className: 'lnsConfigPanel__overlay',
        size: 's',
        'data-test-subj': dataTestSubjFinal,
        type: 'push',
        paddingSize: 'm',
        maxWidth: 800,
        hideCloseButton: true,
        isResizable: true,
        onClose: (overlayRef) => {
          overlayTracker?.clearOverlays();
          overlayRef.close();
        },
        outsideClickCloses: true,
      }
    );
    if (uuid) {
      overlayTracker?.openOverlay(handle, { focusedPanelId: uuid });
    }
  }
}
