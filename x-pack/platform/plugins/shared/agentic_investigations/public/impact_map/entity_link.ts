/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { ImpactEntityLink, ImpactEntityLinkResolver, ImpactEntityLinkTarget } from '../types';

let resolver: ImpactEntityLinkResolver | undefined;

/** Called once from `setup`; the last registration wins. */
export const setImpactEntityLinkResolver = (next: ImpactEntityLinkResolver): void => {
  resolver = next;
};

/**
 * Where a solution can show the entity, or undefined while it looks, when it has no resolver, or
 * when it does not know the entity. Never an error: the link is a convenience.
 */
export const useImpactEntityLink = (
  entity?: ImpactEntityLinkTarget
): ImpactEntityLink | undefined => {
  const [link, setLink] = useState<ImpactEntityLink | undefined>();
  // The caller builds the entity on every render; its content says whether it changed.
  const serialised = entity ? JSON.stringify(entity) : undefined;
  useEffect(() => {
    setLink(undefined);
    if (!serialised || !resolver) {
      return;
    }
    let isCurrent = true;
    resolver(JSON.parse(serialised)).then(
      (found) => isCurrent && setLink(found),
      () => undefined
    );
    return () => {
      isCurrent = false;
    };
  }, [serialised]);
  return link;
};
