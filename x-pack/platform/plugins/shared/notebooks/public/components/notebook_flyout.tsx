/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, type ReactNode } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiFlyoutResizable,
  EuiPanel,
  EuiPortal,
  useEuiTheme,
  useResizeObserver,
  type EuiFlyoutResizableProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useNotebook } from './notebook_context';

const FLYOUT_WIDTH_STORAGE_KEY = 'notebooks:flyoutWidth';

type NotebookFlyoutProps = Omit<EuiFlyoutResizableProps, 'size' | 'onResize'> & {
  /** Content shown over the page, left of the flyout; renders the flyout above the header. */
  aside?: ReactNode;
};

/** A resizable flyout whose width is shared by every notebook flyout and kept across sessions. */
export const NotebookFlyout = ({ aside, ...props }: NotebookFlyoutProps) => {
  const { openFlyouts$ } = useNotebook();
  const { euiTheme } = useEuiTheme();
  const [width, setWidth] = useLocalStorage<number>(FLYOUT_WIDTH_STORAGE_KEY);
  const [flyout, setFlyout] = useState<HTMLElement | null>(null);
  const { width: flyoutWidth } = useResizeObserver(aside ? flyout : null, 'width');

  useEffect(() => {
    openFlyouts$.next(openFlyouts$.getValue() + 1);
    return () => openFlyouts$.next(openFlyouts$.getValue() - 1);
  }, [openFlyouts$]);

  return (
    <>
      <EuiFlyoutResizable
        {...props}
        {...(aside ? { container: null, outsideClickCloses: false } : {})}
        ref={setFlyout}
        size={width ?? 's'}
        onResize={setWidth}
      />
      {aside && (
        <EuiPortal>
          <div
            css={css`
              position: fixed;
              inset: 0 ${flyoutWidth}px 0 0;
              z-index: ${Number(euiTheme.levels.mask) - 1};
              display: flex;
              padding: ${euiTheme.size.xl};
            `}
          >
            <EuiPanel
              paddingSize="m"
              css={css`
                flex: 1;
              `}
            >
              {aside}
            </EuiPanel>
          </div>
        </EuiPortal>
      )}
    </>
  );
};
