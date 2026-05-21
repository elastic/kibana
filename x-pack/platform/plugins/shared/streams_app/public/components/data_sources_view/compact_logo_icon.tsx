/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useState } from 'react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';

const COMPACT_LOGO_SIZE = 20;
const COMPACT_LOGO_BG_PADDING = 6;

export const CompactLogoIcon: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const { euiTheme } = useEuiTheme();
  const [loadFailed, setLoadFailed] = useState(false);

  useLayoutEffect(() => {
    setLoadFailed(false);
    const probe = new Image();
    let cancelled = false;
    probe.onload = () => {
      if (!cancelled) {
        setLoadFailed(false);
      }
    };
    probe.onerror = () => {
      if (!cancelled) {
        setLoadFailed(true);
      }
    };
    probe.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: COMPACT_LOGO_SIZE + COMPACT_LOGO_BG_PADDING * 2,
    height: COMPACT_LOGO_SIZE + COMPACT_LOGO_BG_PADDING * 2,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    borderRadius: 8,
    border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
    flexShrink: 0,
  };

  return (
    <div style={style}>
      {loadFailed ? (
        <EuiIcon type="logoElastic" size="s" color="text" />
      ) : (
        <img
          src={src}
          alt={alt}
          style={{ width: COMPACT_LOGO_SIZE, height: COMPACT_LOGO_SIZE, objectFit: 'contain' }}
        />
      )}
    </div>
  );
};
