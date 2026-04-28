/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApiConfig } from '@kbn/lens-embeddable-utils';
import type { LensByValueSerializedAPIConfig } from '@kbn/lens-common-2';

import { flattenApiConfig, isFlattenedAPIConfig, unflattenAPIConfig } from './utils';

describe('flattenApiConfig / unflattenAPIConfig', () => {
  it('round-trips panel metadata and API chart fields', () => {
    const chartFields = { type: 'xy' } as LensApiConfig;
    const nested: LensByValueSerializedAPIConfig = {
      title: 'Panel',
      attributes: chartFields,
    };

    const flat = flattenApiConfig(nested);

    expect(isFlattenedAPIConfig(flat)).toBe(true);
    expect('attributes' in flat).toBe(false);
    expect(flat.type).toBe('xy');
    expect(flat.title).toBe('Panel');

    const back = unflattenAPIConfig(flat);
    expect(back.title).toBe('Panel');
    expect(back.attributes).toEqual(chartFields);
  });
});
