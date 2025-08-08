/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BannerInfoResponse {
  allowed: boolean;
  banner: BannerConfiguration;
}

export type BannerPlacement = 'disabled' | 'top';

export interface BannerConfiguration {
  placement: BannerPlacement;
  textContent: string;
  textColor: string;
  linkColor: string;
  backgroundColor: string;
}
