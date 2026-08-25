/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { BehaviorSubject } from 'rxjs';
import { css } from '@emotion/react';

export const sidenavPanelHost$ = new BehaviorSubject<HTMLElement | null>(null);

const hostStyles = css`
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export const AgentBuilderPanel: React.FC = () => {
  const setHost = useCallback((node: HTMLDivElement | null) => {
    sidenavPanelHost$.next(node);
  }, []);

  return <div css={hostStyles} ref={setHost} />;
};
