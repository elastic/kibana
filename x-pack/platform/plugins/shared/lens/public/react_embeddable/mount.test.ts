/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { openLazyFlyout } from '@kbn/presentation-util';
import { LENS_ESQL_INLINE_FLYOUT_SIZE, mountInlinePanel } from './mount';

jest.mock('@kbn/presentation-util', () => ({
  openLazyFlyout: jest.fn(),
}));

const openLazyFlyoutMock = openLazyFlyout as jest.MockedFunction<typeof openLazyFlyout>;

const mount = (isEsql?: boolean) =>
  mountInlinePanel({
    core: {} as CoreStart,
    loadContent: async () => undefined,
    options: { isEsql },
  });

describe('mountInlinePanel flyout size', () => {
  beforeEach(() => {
    openLazyFlyoutMock.mockClear();
  });

  it('opens ES|QL panels at 600px', async () => {
    await mount(true);

    expect(openLazyFlyoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        flyoutProps: expect.objectContaining({ size: LENS_ESQL_INLINE_FLYOUT_SIZE }),
      })
    );
    expect(LENS_ESQL_INLINE_FLYOUT_SIZE).toBe(600);
  });

  it('omits size for DSL panels so openLazyFlyout keeps its 500px default', async () => {
    await mount(false);

    const flyoutProps = openLazyFlyoutMock.mock.calls[0][0].flyoutProps;
    expect(flyoutProps).not.toHaveProperty('size');
  });
});
