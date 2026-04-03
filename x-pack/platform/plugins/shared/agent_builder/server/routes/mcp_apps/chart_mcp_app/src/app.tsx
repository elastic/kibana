/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useApp } from '@modelcontextprotocol/ext-apps/react';
import '@elastic/charts/dist/theme_light.css';

import type { LensChartPayload } from './types';
import { LensRenderer } from './lens_renderer';

export const App = () => {
  const [payload, setPayload] = useState<LensChartPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, error: connectionError } = useApp({
    appInfo: { name: 'Lens Chart MCP App', version: '2.0.0' },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => {
        if (result.isError) {
          const text = result.content?.find((c) => c.type === 'text');
          setError(text && 'text' in text ? text.text : 'Unknown error');
          return;
        }

        const structured = result.structuredContent as LensChartPayload | undefined;
        if (structured?.visualization && structured?.data) {
          setPayload(structured);
        } else {
          setError('Received unexpected data format');
        }
      };
    },
  });

  if (connectionError) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <strong>Connection error:</strong> {connectionError.message}
      </div>
    );
  }

  if (!isConnected) {
    return <div style={{ padding: '1rem', textAlign: 'center' }}>Connecting…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#c00' }}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!payload) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>Waiting for visualization data…</div>
    );
  }

  return <LensRenderer payload={payload} />;
};
