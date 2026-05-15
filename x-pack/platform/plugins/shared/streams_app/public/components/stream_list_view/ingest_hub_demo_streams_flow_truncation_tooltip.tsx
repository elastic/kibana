/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { EuiToolTip } from '@elastic/eui';

const titleClampCss = css`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  & a.euiLink {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;
  }
`;

export interface FlowCanvasTruncationTooltipProps {
  readonly tooltipContent: ReactNode;
  readonly children: ReactNode;
}

/**
 * Wraps single-line title content; shows {@link EuiToolTip} only when the label is truncated.
 */
export function FlowCanvasTruncationTooltip({
  tooltipContent,
  children,
}: FlowCanvasTruncationTooltipProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const measure = () => {
      setIsTruncated(el.scrollWidth > el.clientWidth + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [tooltipContent, children]);

  const body = (
    <div ref={ref} css={titleClampCss}>
      {children}
    </div>
  );

  if (!isTruncated) {
    return body;
  }

  return (
    <EuiToolTip content={tooltipContent} position="top" delay="regular">
      {body}
    </EuiToolTip>
  );
}
