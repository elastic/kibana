/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

type ImpactDetailsRenderer = (data: unknown) => ReactNode;

let renderer: ImpactDetailsRenderer | undefined;

/** The investigations plugin registers the details renderer. This package cannot import it. */
export const registerImpactDetailsRenderer = (next: ImpactDetailsRenderer): void => {
  renderer = next;
};

/** Drops the renderer. Tests use this so a registration does not leak. */
export const clearImpactDetailsRenderer = (): void => {
  renderer = undefined;
};

/** Renders one impact document in the overview, or null when nothing registered. */
export const renderImpactDetails = (data: unknown): ReactNode => renderer?.(data) ?? null;
