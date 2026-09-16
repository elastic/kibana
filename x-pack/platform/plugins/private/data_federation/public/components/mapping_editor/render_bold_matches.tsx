/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export const renderBoldMatches = (text: string, query: string): React.ReactNode => {
  const t = text ?? '';
  const q = query.trim();

  if (!t) return <span aria-hidden="true">&nbsp;</span>;
  if (!q) return t;

  const lowerText = t.toLowerCase();
  const lowerQuery = q.toLowerCase();

  const parts: React.ReactNode[] = [];
  let idx = 0;
  while (idx < t.length) {
    const matchAt = lowerText.indexOf(lowerQuery, idx);
    if (matchAt === -1) {
      parts.push(t.slice(idx));
      break;
    }

    if (matchAt > idx) {
      parts.push(t.slice(idx, matchAt));
    }

    parts.push(<strong key={`m-${matchAt}`}>{t.slice(matchAt, matchAt + q.length)}</strong>);
    idx = matchAt + q.length;
  }

  return <>{parts}</>;
};

