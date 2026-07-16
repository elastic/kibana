/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { ensureElasticDocumentationInstalled } from './product_documentation_install';

const inferenceId = '.elser-2-elasticsearch';

function createLog(): ToolingLog {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    verbose: jest.fn(),
  } as unknown as ToolingLog;
}

describe('ensureElasticDocumentationInstalled', () => {
  it('returns without installing when documentation is already installed', async () => {
    const fetch = jest.fn().mockResolvedValue({ overall: 'installed', perProducts: {} });
    const log = createLog();

    const result = await ensureElasticDocumentationInstalled({ fetch, log, inferenceId });

    expect(result).toEqual({ installedBySuite: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('polls through installing and skips uninstall when another worker installed docs', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({ overall: 'installing', perProducts: {} })
      .mockResolvedValueOnce({ overall: 'installed', perProducts: {} });
    const log = createLog();

    const result = await ensureElasticDocumentationInstalled({ fetch, log, inferenceId });

    expect(result).toEqual({ installedBySuite: false });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(log.info).toHaveBeenCalledWith(
      'Elastic documentation install already in progress; waiting for completion'
    );
  });

  it('retries install when the install API returns installed=false then status reaches installed', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({ overall: 'uninstalled', perProducts: {} })
      .mockResolvedValueOnce({ installed: false, failureReason: 'ELSER warming' })
      .mockResolvedValueOnce({ overall: 'installed', perProducts: {} });
    const log = createLog();

    const result = await ensureElasticDocumentationInstalled({ fetch, log, inferenceId });

    expect(result).toEqual({ installedBySuite: true });
    expect(fetch).toHaveBeenCalledWith('/internal/product_doc_base/install', {
      method: 'POST',
      body: JSON.stringify({ inferenceId }),
    });
  });
});
