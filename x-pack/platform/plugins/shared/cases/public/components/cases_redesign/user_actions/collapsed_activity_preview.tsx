/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import * as i18n from './translations';

interface CollapsedActivityPreviewProps {
  children: React.ReactNode;
  /** Expands the activity this preview belongs to. */
  onExpand: () => void;
  'data-test-subj'?: string;
}

/**
 * Two-line crop of an activity's own body, used in place of hiding it entirely when the activity is
 * collapsed. Mirrors the case description's collapsed preview so a compacted feed still says what
 * each row contains.
 *
 * The crop measures whether it is actually clipping anything and only then offers "Show more". A
 * fade alone was not enough: when a body starts with a heading the clip lands in the whitespace
 * after it, so there was nothing for the fade to act on and a truncated comment looked complete —
 * while a comment shorter than the clamp got a fade suggesting content that did not exist.
 */
export const CollapsedActivityPreview: React.FC<CollapsedActivityPreviewProps> = ({
  children,
  onExpand,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const sFontSize = useEuiFontSize('s');
  const cropRef = useRef<HTMLDivElement | null>(null);
  const [isClipped, setIsClipped] = useState(false);

  // `inert` rather than just `aria-hidden`: the crop can contain links, buttons and embeddables, and
  // a clipped control the reader cannot see must not be reachable by keyboard either. React 18 does
  // not forward `inert` as a prop, so it is set on the node directly.
  const registerCrop = useCallback((node: HTMLDivElement | null) => {
    cropRef.current = node;
    node?.setAttribute('inert', '');
  }, []);

  useEffect(() => {
    const node = cropRef.current;
    if (!node) {
      return;
    }

    const measure = () => setIsClipped(node.scrollHeight - node.clientHeight > 1);
    measure();

    // Markdown, images and embeddables settle after mount, so the first measurement is not the last
    // word on whether anything is hidden.
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of Array.from(node.children)) {
      observer.observe(child);
    }
    return () => observer.disconnect();
  }, [children]);

  const styles = useMemo(
    () => ({
      // Three lines of room for two readable ones: the third is where the fade lands, so two lines
      // arrive at full contrast instead of the second being half-dissolved. Height rather than
      // -webkit-line-clamp because an activity body is arbitrary block content (markdown, tables,
      // embeddables), which line-clamp cannot measure.
      crop: css`
        max-block-size: calc(${sFontSize.lineHeight} * 3);
        overflow: hidden;
        pointer-events: none;
        user-select: none;
        color: ${euiTheme.colors.textSubdued};
      `,
      // Only fade when something is genuinely being cut off — otherwise the fade itself is a false
      // claim that there is more to read.
      clipped: css`
        /* Any fully opaque colour works — a mask reads only the alpha channel. */
        mask-image: linear-gradient(
          to bottom,
          ${euiTheme.colors.textParagraph} 66%,
          transparent 100%
        );
      `,
    }),
    [euiTheme, sFontSize]
  );

  return (
    <div data-test-subj={dataTestSubj}>
      <div
        ref={registerCrop}
        aria-hidden={true}
        css={[styles.crop, isClipped ? styles.clipped : undefined]}
        data-test-subj={dataTestSubj ? `${dataTestSubj}-crop` : undefined}
      >
        {children}
      </div>
      {/* Outside the inert crop so it stays clickable and focusable, and a far larger target than
          the collapse icon in the header — which sits nowhere near the text it governs. */}
      {isClipped ? (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          iconType="arrowDown"
          onClick={onExpand}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-show-more` : undefined}
        >
          {i18n.SHOW_MORE_ACTIVITY}
        </EuiButtonEmpty>
      ) : null}
    </div>
  );
};

CollapsedActivityPreview.displayName = 'CollapsedActivityPreview';
