/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { IBasePath } from '@kbn/core/server';
import { getPublicKibanaUrl, toKibanaAppUrl } from './get_kibana_url';

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

describe('toKibanaAppUrl', () => {
  it('joins the app and path onto the Kibana URL, percent-encoded', () => {
    expect(
      toKibanaAppUrl('https://kibana.example.com/s/ops/', 'discover', "#/?_a=(esql:'FROM logs')")
    ).toBe("https://kibana.example.com/s/ops/app/discover#/?_a=(esql:'FROM%20logs')");
    expect(toKibanaAppUrl('https://kibana.example.com', 'agent_builder')).toBe(
      'https://kibana.example.com/app/agent_builder'
    );
  });
});
