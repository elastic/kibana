/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useEffect } from 'react';
import type { LogLine } from '../types.js';
import { stripAnsi } from '../utils/strip_ansi.js';

interface LogViewerProps {
  lines?: LogLine[];
  autoScroll?: boolean;
}

export const LogViewer = ({ lines = [], autoScroll = true }: LogViewerProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  return (
    <div ref={ref} className="log-viewer">
      {lines.length === 0 && <span className="text-muted">Waiting for output...</span>}
      {lines.map((line, i) => {
        const clean = stripAnsi(line.data ?? '');
        const cls = line.type === 'error' ? 'error' : clean.includes('PASS') ? 'success' : '';
        return (
          <div key={i} className={cls}>
            {clean}
          </div>
        );
      })}
    </div>
  );
};
