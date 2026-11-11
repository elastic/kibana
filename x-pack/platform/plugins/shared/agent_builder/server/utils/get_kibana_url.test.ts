/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { IBasePath } from '@kbn/core/server';
import { getPublicKibanaUrl } from './get_kibana_url';

const basePath = (publicBaseUrl?: string) => ({ publicBaseUrl } as IBasePath);
const cloud = { kibanaUrl: 'https://cloud.example.com' } as CloudSetup;

describe('getPublicKibanaUrl', () => {
  it('prefers server.publicBaseUrl, then Cloud’s Kibana URL', () => {
    expect(getPublicKibanaUrl(basePath('https://kibana.example.com'), cloud)).toBe(
      'https://kibana.example.com'
    );
    expect(getPublicKibanaUrl(basePath(), cloud)).toBe('https://cloud.example.com');
  });

  it('has no fallback to the server’s own address', () => {
    expect(getPublicKibanaUrl(basePath(), undefined, 'ops')).toBeUndefined();
  });

  it('adds the space', () => {
    expect(getPublicKibanaUrl(basePath('https://kibana.example.com'), cloud, 'ops')).toBe(
      'https://kibana.example.com/s/ops'
    );
  });
});
