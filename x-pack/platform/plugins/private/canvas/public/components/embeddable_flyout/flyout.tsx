/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Props as ComponentProps } from './flyout.component';
import { AddEmbeddableFlyout as Component } from './flyout.component';
import { useCanvasApi } from '../hooks/use_canvas_api';

type FlyoutProps = Pick<ComponentProps, 'onClose'>;

export const EmbeddableFlyoutPortal: React.FunctionComponent<ComponentProps> = (props) => {
  const el: HTMLElement = useMemo(() => document.createElement('div'), []);

  useEffect(() => {
    let body = document.querySelector('body');
    if (body && el) {
      body.appendChild(el);
    }
    return () => {
      body = document.querySelector('body');
      if (body && el) {
        body.removeChild(el);
      }
    };
  }, [el]);

  if (!el) {
    return null;
  }

  return createPortal(<Component {...props} />, el);
};

export const AddEmbeddablePanel: React.FunctionComponent<FlyoutProps> = ({ onClose }) => {
  const canvasApi = useCanvasApi();

  return <EmbeddableFlyoutPortal onClose={onClose} container={canvasApi} />;
};
