/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const IFRAME_TITLE = i18n.translate('xpack.customContent.iframeTitle', {
  defaultMessage: 'Custom panel',
});

const iframeCss = css({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  border: 'none',
  background: 'transparent',
});

export interface CustomContentFrameProps {
  /** The finished document: filled, cleaned and themed. */
  html: string;
  /** The frame fills the room its container has, which is at least this tall. */
  minHeight: number;
  /** The sandbox of the frame. Empty, the default, allows nothing. */
  sandbox?: string;
}

/**
 * The frame that custom content is shown in. The markup is written by a model or an author, so it
 * is only ever shown in a frame that cannot run scripts or reach the network.
 */
export const CustomContentFrame = ({ html, minHeight, sandbox = '' }: CustomContentFrameProps) => {
  const containerCss = useMemo(
    () => css({ position: 'relative', flex: '1 1 0%', minHeight }),
    [minHeight]
  );

  return (
    <div css={containerCss}>
      <iframe css={iframeCss} srcDoc={html} sandbox={sandbox} title={IFRAME_TITLE} />
    </div>
  );
};
