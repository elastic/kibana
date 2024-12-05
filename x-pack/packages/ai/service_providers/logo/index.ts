/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamic } from '@kbn/shared-ux-utility';
import { ServiceProviderID } from '../id';

const LOGO_REACT = {
  bedrock: dynamic(() => import('./bedrock')),
  gemini: dynamic(() => import('./gemini')),
  openai: dynamic(() => import('./open_ai')),
} as const;

const toBase64 = (data: string) => `data:image/svg+xml;base64,${btoa(data)}`;

const LOGO_BASE_64 = {
  bedrock: async () => {
    const svg = await import('!!raw-loader!./bedrock.svg');
    return toBase64(svg.default);
  },
  gemini: async () => {
    const svg = await import('!!raw-loader!./gemini.svg');
    return toBase64(svg.default);
  },
  openai: async () => {
    const svg = await import('!!raw-loader!./open_ai.svg');
    return toBase64(svg.default);
  },
};

const LOGO_URL = {
  bedrock: async () => {
    const svg = await import('./bedrock.svg');
    return toBase64(svg.default);
  },
  gemini: async () => {
    const svg = await import('./gemini.svg');
    return toBase64(svg.default);
  },
  openai: async () => {
    const svg = await import('./open_ai.svg');
    return toBase64(svg.default);
  },
};

/**
 * Get a lazy-loaded React component, wrapped in a `Suspense` boundary, for the logo of a service provider.
 */
export const getReactComponentLogo = (id: ServiceProviderID) => LOGO_REACT[id];

/**
 * Get the base64-encoded SVG of the logo of a service provider.
 */
export const getBase64Logo = async (id: ServiceProviderID) => LOGO_BASE_64[id]();

/**
 * Get the URL of the logo of a service provider.
 */
export const getUrlLogo = async (id: ServiceProviderID) => LOGO_URL[id]();
