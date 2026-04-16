/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { openAppearanceModal } from './appearance_selector';

describe('openAppearanceModal', () => {
  let core: ReturnType<typeof coreMock.createStart>;
  let security: ReturnType<typeof securityMock.createStart>;

  beforeEach(() => {
    core = coreMock.createStart();
    security = securityMock.createStart();

    core.overlays.openModal.mockImplementation(() => ({
      close: jest.fn(),
      onClose: Promise.resolve(),
    }));
  });

  it('opens the appearance modal', () => {
    openAppearanceModal({ core, security, isServerless: false });
    expect(core.overlays.openModal).toHaveBeenCalledTimes(1);
  });
});
