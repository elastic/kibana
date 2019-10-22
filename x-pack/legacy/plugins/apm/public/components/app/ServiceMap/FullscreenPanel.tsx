/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonIcon, EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';

const Button = styled(EuiButtonIcon)`
  display: block;
  margin: ${theme.paddingSizes.xs};
`;

interface FullscreenPanelProps {
  element: Element | null;
}

export function FullscreenPanel({ element }: FullscreenPanelProps) {
  const canDoFullscreen =
    element && element.ownerDocument && element.ownerDocument.fullscreenEnabled;

  if (!canDoFullscreen) {
    return null;
  }

  function doFullscreen() {
    if (element && element.ownerDocument && canDoFullscreen) {
      const isFullscreen = element.ownerDocument.fullscreenElement !== null;

      if (isFullscreen) {
        element.ownerDocument.exitFullscreen();
      } else {
        element.requestFullscreen();
      }
    }
  }

  const label = i18n.translate('xpack.apm.serviceMap.fullscreen', {
    defaultMessage: 'Full screen'
  });

  return (
    <EuiPanel hasShadow={true} paddingSize="none">
      <Button
        aria-label={label}
        color="text"
        iconType="fullScreen"
        onClick={doFullscreen}
        title={label}
      />
    </EuiPanel>
  );
}
