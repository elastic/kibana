/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { CSSProperties } from 'react';
import {
  initialExternalEmbedState,
  ExternalEmbedStateProvider,
  useExternalEmbedState,
} from '../index';
import { renderers } from './renderers';
import { ExternalEmbedState } from '../../types';
import json from '../../test/hello.json';

const Container = ({ children, height, width, style }: Props) => {
  const [{ refs }] = useExternalEmbedState();
  return (
    <div
      className="kbnCanvas"
      ref={refs.stage}
      style={{ ...style, height, width, overflow: 'hidden', position: 'relative' }}
    >
      {children}
    </div>
  );
};

interface Props {
  children: any;
  height?: number;
  width?: number;
  isScrubberVisible?: boolean;
  style?: CSSProperties;
}
export const Context = ({ children, height, width, isScrubberVisible, style }: Props) => {
  const registeredRenderers: { [key: string]: Function } = {};

  // Register all of the rendering experessions with a bespoke registry.
  const renderersRegistry = {
    get: (name: string) => {
      return registeredRenderers[name];
    },
    register: (fn: Function) => {
      registeredRenderers[fn.name] = fn();
    },
  };

  renderers.forEach(renderer => renderersRegistry.register(renderer));
  const { footer } = initialExternalEmbedState;

  const initialState: ExternalEmbedState = {
    ...initialExternalEmbedState,
    footer: {
      ...footer,
      isScrubberVisible: isScrubberVisible || footer.isScrubberVisible,
    },
    stage: {
      height: 400,
      page: 0,
      width: 600,
    },
    renderersRegistry,
    workpad: json,
    refs: {
      stage: React.createRef(),
    },
  };

  return (
    <ExternalEmbedStateProvider initialState={initialState}>
      <Container {...{ height, width, style }}>{children}</Container>
    </ExternalEmbedStateProvider>
  );
};
