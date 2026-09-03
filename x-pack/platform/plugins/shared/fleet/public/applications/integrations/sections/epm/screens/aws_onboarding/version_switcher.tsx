/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiText,
} from '@elastic/eui';

import { AwsOnboardingProtoPage } from '.';

type PrototypeVersion = 'sept-1' | 'outdated-services';

const VERSION_OPTIONS = [
  { value: 'sept-1', text: '1 Sept' },
  { value: 'outdated-services', text: 'Outdated services' },
];

const VERSION_BAR_HEIGHT = 32;

// One service from each of several categories to exercise the warning state.
const OUTDATED_SERVICE_IDS = new Set([
  'guardduty',   // Security, Identity and Compliance
  'lambda',      // Compute Services
  'elb',         // Networking and Content Delivery
  'rds',         // Database Services
  'kinesis',     // Analytics and Streaming
  'billing',     // Cost Management
]);

const VersionBar: React.FunctionComponent<{
  version: PrototypeVersion;
  onChange: (v: PrototypeVersion) => void;
}> = ({ version, onChange }) => (
  <div
    style={{
      background: '#1a1c21',
      height: VERSION_BAR_HEIGHT,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 16px',
      gap: 8,
    }}
  >
    <EuiBadge color="#3d3f47" style={{ color: '#8d919b', fontSize: 10 }}>
      Prototype
    </EuiBadge>
    <EuiText size="xs" style={{ color: '#8d919b' }}>
      Version:
    </EuiText>
    <EuiSelect
      compressed
      options={VERSION_OPTIONS}
      value={version}
      onChange={(e) => onChange(e.target.value as PrototypeVersion)}
      aria-label="Prototype version"
      style={{ minWidth: 160 }}
    />
  </div>
);

export const AwsOnboardingPage: React.FunctionComponent = () => {
  const [version, setVersion] = useState<PrototypeVersion>('sept-1');

  // Render the version bar in a portal fixed to the very top of the viewport,
  // above Kibana's own chrome. Push Kibana's fixed header down by the same
  // amount so nothing is hidden behind the bar.
  const [portalEl] = useState(() => {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:0;left:0;right:0;height:${VERSION_BAR_HEIGHT}px;z-index:10000;`;
    document.body.appendChild(el);
    return el;
  });

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'proto-version-bar-offset';
    styleEl.textContent = `
      .euiHeader--fixed,
      .euiHeader[style*="position: fixed"],
      .euiHeader[style*="position:fixed"] {
        top: ${VERSION_BAR_HEIGHT}px !important;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      document.body.removeChild(portalEl);
      styleEl.remove();
    };
  }, [portalEl]);

  return (
    <>
      {ReactDOM.createPortal(
        <VersionBar version={version} onChange={setVersion} />,
        portalEl
      )}
      {/* Offset so page content starts below both the version bar and Kibana's header */}
      <AwsOnboardingProtoPage
        key={version}
        outdatedServiceIds={version === 'outdated-services' ? OUTDATED_SERVICE_IDS : undefined}
      />
    </>
  );
};
