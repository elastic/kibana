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
import { type UseEuiTheme } from '@elastic/eui';

/**
 * Shared logic to mount the inline config panel
 * @param ConfigPanel
 * @param coreStart
 * @param overlayTracker
 * @param uuid
 * @param container
 */
export function mountInlineEditPanel(
  ConfigPanel: JSX.Element,
  coreStart: CoreStart,
  overlayTracker: TracksOverlays | undefined,
  uuid?: string,
  container?: HTMLElement | null
) {
  if (container) {
    ReactDOM.render(ConfigPanel, container);
  } else {
    const handle = coreStart.overlays.openFlyout(
      toMountPoint(
        React.cloneElement(ConfigPanel, {
          closeFlyout: () => {
            overlayTracker?.clearOverlays();
            handle.close();
          },
        }),
        coreStart
      ),
      {
        className: 'lnsConfigPanel__overlay',
        css: inlineFlyoutStyles,
        size: 's',
        'data-test-subj': 'customizeLens',
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

// styles needed to display extra drop targets that are outside of the config panel main area while also allowing to scroll vertically
const inlineFlyoutStyles = ({ euiTheme }: UseEuiTheme) => `
  clip-path: polygon(-100% 0, 100% 0, 100% 100%, -100% 100%);
  max-inline-size: 640px;
  min-inline-size: 256px;
  background:${euiTheme.colors.backgroundBaseSubdued};
  @include euiBreakpoint('xs', 's', 'm') {
    clip-path: none;
  }
  .kbnOverlayMountWrapper {
    padding-left: 400px;
    margin-left: -400px;
    pointer-events: none;
    .euiFlyoutFooter {
      pointer-events: auto;
    }
  }
`;
