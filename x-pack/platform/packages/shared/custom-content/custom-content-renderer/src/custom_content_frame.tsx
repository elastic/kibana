/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useResizeObserver } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  CUSTOM_CONTENT_DEFAULT_HEIGHT,
  CUSTOM_CONTENT_MAX_HEIGHT,
} from '@kbn/custom-content-common';

const IFRAME_TITLE = i18n.translate('xpack.customContent.iframeTitle', {
  defaultMessage: 'Custom panel',
});

const MEASURE_TITLE = i18n.translate('xpack.customContent.measureFrameTitle', {
  defaultMessage: 'Size of the custom content',
});

/** Below this a measurement is a collapsed document, not a template that is that short. */
const MIN_MEASURED_HEIGHT = 8;

interface CommonProps {
  /** The finished document: filled, cleaned and themed. */
  html: string;
  /** The sandbox of the frame. Empty, the default, allows nothing. */
  sandbox?: string;
  'data-test-subj'?: string;
}

export interface FillingFrameProps extends CommonProps {
  /** The frame fills the room its container has, which is at least this tall. */
  minHeight: number;
  autoHeight?: undefined;
}

export interface AutoHeightFrameProps extends CommonProps {
  /** The frame is as tall as its document, and this tall until that is known. */
  autoHeight: { fallback?: number; testSubj?: string };
  minHeight?: undefined;
}

/**
 * How tall the cleaned template is at the width of its frame. The template is shown in a frame
 * that can do nothing, which nobody can measure, so it is measured in a second one that is
 * hidden, short-lived and has no permission but to be read: it still cannot run a script or reach
 * the network, and only a number leaves it.
 */
const MeasuringFrame = ({
  html,
  onHeight,
  testSubj,
}: {
  html: string;
  onHeight: (height: number) => void;
  testSubj?: string;
}) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null);
  const { width } = useResizeObserver(wrapper);

  const measure = useCallback(() => {
    const height = frame.current?.contentDocument?.documentElement?.scrollHeight;
    if (height !== undefined && height >= MIN_MEASURED_HEIGHT) {
      onHeight(Math.min(CUSTOM_CONTENT_MAX_HEIGHT, Math.ceil(height)));
    }
  }, [onHeight]);

  // The text wraps differently at another width, so it is read again.
  useEffect(measure, [measure, width]);

  // Read once the document has loaded, and again when a new one does.
  useEffect(() => {
    const element = frame.current;
    element?.addEventListener('load', measure);
    return () => element?.removeEventListener('load', measure);
  }, [measure]);

  return (
    <div
      ref={setWrapper}
      aria-hidden="true"
      css={css({
        position: 'absolute',
        inset: 0,
        height: 0,
        overflow: 'hidden',
        visibility: 'hidden',
      })}
    >
      <iframe
        ref={frame}
        // Same-origin so that its height can be read, and nothing else: no scripts.
        sandbox="allow-same-origin"
        srcDoc={html}
        tabIndex={-1}
        title={MEASURE_TITLE}
        data-test-subj={testSubj}
        css={css({ display: 'block', width: '100%', height: 1, border: 'none' })}
      />
    </div>
  );
};

/**
 * The frame that custom content is shown in, wherever it is shown: a panel, a chat or an app. The
 * markup is written by a model or an author, so it is only ever shown in a frame that cannot run
 * scripts or reach the network.
 */
export const CustomContentFrame = ({
  html,
  sandbox = '',
  autoHeight,
  minHeight,
  'data-test-subj': dataTestSubj,
}: FillingFrameProps | AutoHeightFrameProps) => {
  const [measured, setMeasured] = useState<number>();

  const containerCss = useMemo(
    () =>
      autoHeight
        ? css({ position: 'relative' })
        : css({ position: 'relative', flex: '1 1 0%', minHeight }),
    [autoHeight, minHeight]
  );

  const iframeCss = useMemo(
    () =>
      autoHeight
        ? css({
            display: 'block',
            width: '100%',
            height: measured ?? autoHeight.fallback ?? CUSTOM_CONTENT_DEFAULT_HEIGHT,
            border: 'none',
            background: 'transparent',
          })
        : css({
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent',
          }),
    [autoHeight, measured]
  );

  return (
    <div css={containerCss}>
      {autoHeight && (
        <MeasuringFrame html={html} onHeight={setMeasured} testSubj={autoHeight.testSubj} />
      )}
      <iframe
        css={iframeCss}
        srcDoc={html}
        sandbox={sandbox}
        title={IFRAME_TITLE}
        data-test-subj={dataTestSubj}
      />
    </div>
  );
};
