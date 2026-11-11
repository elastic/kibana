/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

/** Fetches `src` into an object URL so links can open or download files served as attachments. */
export const useObjectUrl = (src: string): string | undefined => {
  const [objectUrl, setObjectUrl] = useState<string>();

  useEffect(() => {
    let isCancelled = false;
    let createdUrl: string | undefined;
    setObjectUrl(undefined);

    const load = async () => {
      try {
        // `src` already includes the base path, so core `http.fetch` would prepend it twice.
        const response = await fetch(src);
        if (!response.ok) {
          return;
        }
        const blob = await response.blob();
        if (isCancelled) {
          return;
        }
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      } catch {
        // On failure the URL stays undefined.
      }
    };

    load();

    return () => {
      isCancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src]);

  return objectUrl;
};
