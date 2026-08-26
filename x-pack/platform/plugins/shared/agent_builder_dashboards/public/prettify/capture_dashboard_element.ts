/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import domtoimage from 'dom-to-image-more';

const isReadableStylesheet = (style: CSSStyleSheet): boolean => {
  try {
    void style.cssRules;
    return true;
  } catch {
    return false;
  }
};

/**
 * Rasterize the painted dashboard viewport, including panel chrome and charts.
 */
export const captureDashboardElementPng = async (element: HTMLElement): Promise<Blob> => {
  const width = Math.max(1, Math.ceil(element.scrollWidth || element.getBoundingClientRect().width));
  const height = Math.max(
    1,
    Math.ceil(element.scrollHeight || element.getBoundingClientRect().height)
  );

  const blob = await domtoimage.toBlob(element, {
    bgcolor: '#ffffff',
    cacheBust: true,
    width,
    height,
    styleFilter: isReadableStylesheet,
  });
  if (!blob) {
    throw new Error('Failed to capture the dashboard as a PNG');
  }
  return blob;
};
