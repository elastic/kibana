/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { useRef } from 'react';
import { useFetcher } from '../../../hooks/useFetcher';
import { useLicense } from '../../../hooks/useLicense';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { Controls } from './Controls';
import { Cytoscape } from './Cytoscape';
import { PlatinumLicensePrompt } from './PlatinumLicensePrompt';
import { Popover } from './Popover';

interface ServiceMapProps {
  serviceName?: string;
}

const backgroundGradient = `linear-gradient(
    90deg,
    ${theme.euiPageBackgroundColor}
      calc(${theme.euiSizeL} - calc(${theme.euiSizeXS} / 2)),
    transparent 1%
  )
  center,
  linear-gradient(
    ${theme.euiPageBackgroundColor}
      calc(${theme.euiSizeL} - calc(${theme.euiSizeXS} / 2)),
    transparent 1%
  )
  center,
  ${theme.euiColorLightShade}`;

export function ServiceMap({ serviceName }: ServiceMapProps) {
  const {
    urlParams: { start, end }
  } = useUrlParams();

  const wrapDivRef = useRef<HTMLDivElement | null>(null);

  const { data } = useFetcher(
    callApmApi => {
      if (start && end) {
        return callApmApi({
          pathname: '/api/apm/service-map',
          params: { query: { start, end } }
        });
      }
    },
    [start, end]
  );

  const cytoscapeDivStyle = {
    height: wrapDivRef.current?.getBoundingClientRect()?.height ?? 0,
    background: backgroundGradient,
    backgroundSize: `${theme.euiSizeL} ${theme.euiSizeL}`
  };

  const elements = Array.isArray(data) ? data : [];
  const license = useLicense();
  const isValidPlatinumLicense =
    license?.isActive &&
    (license?.type === 'platinum' || license?.type === 'trial');

  // The service map has some extra "bleed" that makes it extend all the way to
  // the edges of the page, unlike the other tabs which have a predefined margin.
  const flexItemStyle = {
    margin: `-${theme.gutterTypes.gutterLarge} -13px -36px -10px`
  };

  return isValidPlatinumLicense ? (
    <EuiFlexItem grow={1} style={flexItemStyle}>
      <div ref={wrapDivRef} style={{ height: '100%' }}>
        <Cytoscape
          elements={elements}
          serviceName={serviceName}
          style={cytoscapeDivStyle}
        >
          <Controls />
          <Popover focusedServiceName={serviceName} />
        </Cytoscape>
      </div>
    </EuiFlexItem>
  ) : (
    <PlatinumLicensePrompt />
  );
}
