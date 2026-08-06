/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { css } from '@emotion/react';

/**
 * Layout-only styles for user-authored markdown (case descriptions, comments, display fields).
 *
 * Deliberately does NOT restyle headings, weights, or text sizes. Markdown should render the way
 * markdown renders everywhere else in Kibana; an override here would make the same document look
 * different depending on which app displayed it, which is a worse problem than the one it solves.
 *
 * What is left is purely about line length: pasted machine output (JSON blobs, log lines, stack
 * traces) has no natural break points, so without a cap it stretches to the full panel width and
 * runs well past a readable measure. Elements that become *less* readable when narrowed — tables,
 * code blocks, images — opt back out to the full width.
 */
export const useProseCss = () =>
  useMemo(
    () => css`
      p,
      li,
      blockquote {
        max-inline-size: 90ch;
        overflow-wrap: anywhere;
      }

      table,
      pre,
      img {
        max-inline-size: none;
      }
    `,
    []
  );
