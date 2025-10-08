/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { EuiPortal, useEuiTheme } from '@elastic/eui';

import type { ProcessorInternal } from '../../types';

import { ProcessorInformation } from './processor_information';

export interface Position {
  x: number;
  y: number;
}

interface Props {
  processor: ProcessorInternal;
}

const MOUSE_PADDING_RIGHT = 20;
const MOUSE_PADDING_BOTTOM = 20;

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    tooltip: css`
      position: fixed;
      pointer-events: none;
      z-index: ${euiTheme.levels.menu};
    `,
  };
};

export const PipelineProcessorsItemTooltip: FunctionComponent<Props> = ({ processor }) => {
  const [position, setPosition] = useState<Position | undefined>();
  const styles = useStyles();

  useEffect(() => {
    const mouseMoveListener = (event: MouseEvent) => {
      setPosition({ x: event.pageX, y: event.pageY - window.scrollY });
    };
    document.addEventListener('mousemove', mouseMoveListener);
    return () => {
      document.removeEventListener('mousemove', mouseMoveListener);
    };
  }, []);

  if (!position) {
    return null;
  }

  return (
    /**
     * To get around issues with parent elements potentially being position: relative or
     * overflow: hidden we use a portal to render this tooltip in the document body so
     * that we can render it anywhere the cursor can go.
     */
    <EuiPortal>
      <div
        css={styles.tooltip}
        style={{
          left: position.x + MOUSE_PADDING_RIGHT,
          top: position.y + MOUSE_PADDING_BOTTOM,
        }}
      >
        <ProcessorInformation processor={processor} />
      </div>
    </EuiPortal>
  );
};
