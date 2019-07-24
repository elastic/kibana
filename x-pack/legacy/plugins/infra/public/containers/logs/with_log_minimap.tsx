/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useMemo } from 'react';

import { UrlStateContainer } from '../../utils/url_state';
import { LogViewConfiguration } from './log_view_configuration';

/**
 * Url State
 */

interface LogMinimapUrlState {
  intervalSize?: number;
}

export const WithLogMinimapUrlState = () => {
  const { intervalSize, setIntervalSize } = useContext(LogViewConfiguration.Context);

  const urlState = useMemo(() => ({ intervalSize }), [intervalSize]);

  return (
    <UrlStateContainer
      urlState={urlState}
      urlStateKey="logMinimap"
      mapToUrlState={mapToUrlState}
      onChange={newUrlState => {
        if (newUrlState && newUrlState.intervalSize) {
          setIntervalSize(newUrlState.intervalSize);
        }
      }}
      onInitialize={newUrlState => {
        if (newUrlState && newUrlState.intervalSize) {
          setIntervalSize(newUrlState.intervalSize);
        }
      }}
    />
  );
};

const mapToUrlState = (value: any): LogMinimapUrlState | undefined =>
  value
    ? {
        intervalSize: mapToIntervalSizeUrlState(value.intervalSize),
      }
    : undefined;

const mapToIntervalSizeUrlState = (value: any) =>
  value && typeof value === 'number' ? value : undefined;
