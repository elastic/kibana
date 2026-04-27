/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensByValueSerializedState } from '@kbn/lens-common';

import { simpleMetricAttributes } from '@kbn/lens-embeddable-utils/config_builder/tests/metric/lens_state_config.mock';
import { getTransformOut } from './transform_out';

describe('getTransformOut', () => {
  const transformDrilldownsOut = jest.fn(<T extends { drilldowns?: unknown }>(state: T) => state);

  it.each(['panel title', '', undefined])(
    'should use panel title for "%s" and ignore attributes title',
    (title) => {
      const builder = new LensConfigBuilder(undefined, true);
      const transformOut = getTransformOut(builder, transformDrilldownsOut, false);

      const storedState: LensByValueSerializedState = {
        title,
        attributes: {
          ...simpleMetricAttributes,
          title: 'attributes title', // always ignored
        },
        references: [],
      };

      const result = transformOut(storedState, []);

      expect(result.title).toEqual(title);
    }
  );
});
