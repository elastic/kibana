/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { CSSProperties, RefObject } from 'react';
import {
  initialExternalEmbedState,
  ExternalEmbedStateProvider,
  useExternalEmbedState,
} from '../context/index';
import { renderFunctions } from '../supported_renderers';
import { ExternalEmbedState } from '../types';
import { RendererSpec } from '../../types';
import { snapshots, SnapshotNames } from '.';

jest.mock('../supported_renderers');

const Container = ({
  children,
  height,
  width,
  style,
}: Pick<Props, 'children' | 'height' | 'width' | 'style'>) => {
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
  source?: SnapshotNames;
  height?: number;
  width?: number;
  isScrubberVisible?: boolean;
  style?: CSSProperties;
  stageRef?: RefObject<HTMLDivElement>;
  toolbar?: boolean;
  autoplay?: boolean;
}

export const TestingContext = ({
  children,
  height,
  width,
  isScrubberVisible,
  style,
  stageRef,
  source = 'hello',
  toolbar,
  autoplay,
}: Props) => {
  const renderers: { [key: string]: RendererSpec } = {};

  renderFunctions.forEach(rendererFn => {
    const renderer = rendererFn();
    renderers[renderer.name] = renderer;
  });

  const { footer, settings } = initialExternalEmbedState;
  const { toolbar: toolbarSettings, autoplay: autoplaySettings } = settings;

  const initialState: ExternalEmbedState = {
    ...initialExternalEmbedState,
    footer: {
      ...footer,
      isScrubberVisible: isScrubberVisible || footer.isScrubberVisible,
    },
    settings: {
      ...settings,
      toolbar: {
        ...toolbarSettings,
        isAutohide: !!toolbar,
      },
      autoplay: {
        ...autoplaySettings,
        isEnabled: !!autoplay,
      },
    },
    stage: {
      height: 400,
      page: 0,
      width: 600,
    },
    renderers,
    workpad: snapshots[source],
    refs: {
      stage: stageRef || React.createRef(),
    },
  };

  return (
    <ExternalEmbedStateProvider initialState={initialState}>
      <Container {...{ height, width, style }}>{children}</Container>
    </ExternalEmbedStateProvider>
  );
};
