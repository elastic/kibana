/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState, useEffect } from 'react';
import { EuiButtonIcon, EuiPanel } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { CytoscapeContext } from './Cytoscape';
import { FullscreenPanel } from './FullscreenPanel';

const ControlsContainer = styled('div')`
  left: ${theme.gutterTypes.gutterMedium};
  position: absolute;
  top: ${theme.gutterTypes.gutterSmall};
  z-index: 1; /* The element containing the cytoscape canvas has z-index = 0. */
`;

const Button = styled(EuiButtonIcon)`
  display: block;
  margin: ${theme.paddingSizes.xs};
`;

const ZoomInButton = styled(Button)`
  margin-bottom: ${theme.paddingSizes.s};
`;

const ZoomPanel = styled(EuiPanel)`
  margin-bottom: ${theme.paddingSizes.s};
`;

const duration = parseInt(theme.euiAnimSpeedFast, 10);
const steps = 5;

function doZoom(cy: cytoscape.Core | undefined, increment: number) {
  if (cy) {
    const level = cy.zoom() + increment;
    cy.animate({
      duration,
      zoom: { level, position: cy.$('.primary').position() }
    });
  }
}

export function Controls() {
  const cy = useContext(CytoscapeContext);

  const [zoom, setZoom] = useState((cy && cy.zoom()) || 1);

  useEffect(() => {
    if (cy) {
      cy.on('zoom', event => {
        setZoom(event.cy.zoom());
      });
    }
  }, [cy]);

  function zoomIn() {
    doZoom(cy, increment);
  }

  function zoomOut() {
    doZoom(cy, -increment);
  }

  if (!cy) {
    return null;
  }

  const maxZoom = cy.maxZoom();
  const isMaxZoom = zoom === maxZoom;
  const minZoom = cy.minZoom();
  const isMinZoom = zoom === minZoom;
  const increment = (maxZoom - minZoom) / steps;
  const mapDomElement = cy.container();
  const zoomInLabel = i18n.translate('xpack.apm.serviceMap.zoomIn', {
    defaultMessage: 'Zoom in'
  });
  const zoomOutLabel = i18n.translate('xpack.apm.serviceMap.zoomOut', {
    defaultMessage: 'Zoom out'
  });

  return (
    <ControlsContainer>
      <ZoomPanel hasShadow={true} paddingSize="none">
        <ZoomInButton
          aria-label={zoomInLabel}
          color="text"
          disabled={isMaxZoom}
          iconType="plusInCircleFilled"
          onClick={zoomIn}
          title={zoomInLabel}
        />
        <Button
          aria-label={zoomOutLabel}
          color="text"
          disabled={isMinZoom}
          iconType="minusInCircleFilled"
          onClick={zoomOut}
          title={zoomOutLabel}
        />
      </ZoomPanel>
      <FullscreenPanel element={mapDomElement} />
    </ControlsContainer>
  );
}
