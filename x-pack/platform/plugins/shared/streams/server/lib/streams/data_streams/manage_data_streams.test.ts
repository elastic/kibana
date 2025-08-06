/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTemplateLifecycle } from './manage_data_streams';

describe('getTemplateLifecycle', () => {
  it('returns dsl when only dsl is enabled', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      lifecycle: { enabled: true, data_retention: '30d' },
      settings: { index: { lifecycle: { prefer_ilm: false } } },
    });
    expect(result).toEqual({ dsl: { data_retention: '30d' } });
  });

  it('returns dsl when dsl and ilm are enabled but no policy is set', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      lifecycle: { enabled: true, data_retention: '30d' },
      settings: { index: { lifecycle: { prefer_ilm: true } } },
    });
    expect(result).toEqual({ dsl: { data_retention: '30d' } });
  });

  it('returns ilm when only ilm is enabled', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      settings: { index: { lifecycle: { name: 'my-ilm-policy', prefer_ilm: true } } },
    });
    expect(result).toEqual({ ilm: { policy: 'my-ilm-policy' } });
  });

  it('returns ilm when only ilm is enabled even though prefer_ilm is false', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      settings: { index: { lifecycle: { name: 'my-ilm-policy', prefer_ilm: false } } },
    });
    expect(result).toEqual({ ilm: { policy: 'my-ilm-policy' } });
  });

  it('returns ilm when dsl is disabled and prefer_ilm is false', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      lifecycle: { enabled: false, data_retention: '1d' },
      settings: { index: { lifecycle: { name: 'my-ilm-policy', prefer_ilm: false } } },
    });
    expect(result).toEqual({ ilm: { policy: 'my-ilm-policy' } });
  });

  it('returns ilm when ilm and dsl are enabled but prefer_ilm is true', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      lifecycle: { enabled: true, data_retention: '30d' },
      settings: { index: { lifecycle: { name: 'my-ilm-policy', prefer_ilm: true } } },
    });
    expect(result).toEqual({ ilm: { policy: 'my-ilm-policy' } });
  });

  it('returns disabled when neither dsl nor ilm are enabled', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      settings: {},
      mappings: {},
      lifecycle: { enabled: false },
    });
    expect(result).toEqual({ disabled: {} });
  });
});
