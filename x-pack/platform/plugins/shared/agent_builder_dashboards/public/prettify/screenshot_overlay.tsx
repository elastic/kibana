/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { DASHBOARD_ELEMENT_SELECTOR } from './capture_dashboard_screenshot';

const ScreenshotOverlay = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      data-test-subj="prettifyDashboardScreenshotOverlay"
      role="status"
      aria-label={i18n.translate(
        'xpack.agentBuilderDashboards.prettifyDashboard.screenshotOverlayAriaLabel',
        { defaultMessage: 'Capturing a dashboard screenshot…' }
      )}
      css={css({
        position: 'absolute',
        inset: 0,
        zIndex: euiTheme.levels.mask,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        backgroundColor: euiTheme.colors.backgroundBaseInteractiveOverlay,
      })}
    >
      {/* Sticky keeps the spinner centered in the visible part of long dashboards. */}
      <EuiLoadingSpinner
        size="xl"
        css={css({
          position: 'sticky',
          top: '50%',
          transform: 'translateY(-50%)',
        })}
      />
    </div>
  );
};

// The capture temporarily mutates the dashboard (e.g. expands collapsed sections), so block
// interaction with it until the original layout is restored. The overlay is mounted on the
// dashboard's wrapper rather than the captured element itself so it does not end up in the
// screenshot. Returns a function that hides the overlay.
export const showScreenshotOverlay = (rendering: CoreStart['rendering']): (() => void) => {
  const wrapper = document.querySelector<HTMLElement>(DASHBOARD_ELEMENT_SELECTOR)?.parentElement;
  if (!wrapper) {
    return () => {};
  }

  const originalPosition = wrapper.style.position;
  const { position } = getComputedStyle(wrapper);
  if (!position || position === 'static') {
    wrapper.style.position = 'relative';
  }
  const container = document.createElement('div');
  wrapper.appendChild(container);

  const unmount = toMountPoint(<ScreenshotOverlay />, rendering)(container);

  return () => {
    unmount();
    container.remove();
    wrapper.style.position = originalPosition;
  };
};
