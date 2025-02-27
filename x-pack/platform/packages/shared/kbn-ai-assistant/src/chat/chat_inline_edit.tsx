/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React, { useRef, useEffect } from 'react';

export function ChatInlineEditingContent({
  visible,
  setContainer,
  style,
}: {
  visible?: boolean;
  setContainer?: (element: HTMLDivElement | null) => void;
  style: React.CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef?.current && setContainer) {
      setContainer(containerRef.current);
    }
  }, [setContainer]);

  return (
    <EuiFlexGroup
      className="lnsConfigPanel__overlay"
      style={{ ...style, padding: 0, position: 'relative', blockSize: visible ? '100%' : 0 }}
      direction="column"
      ref={containerRef}
      gutterSize="none"
    />
  );
}
