/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { ImportModal } from './import_modal';

vi.mock('../../../../capabilities/check_capabilities', () => {
      const mocked = {
      usePermissionCheck: () => [true, true],
    };
      return { ...mocked, default: mocked };
    });

const testProps = {
  addImportedEvents: vi.fn(),
  closeImportModal: vi.fn(),
  canCreateCalendar: true,
};

describe('ImportModal', () => {
  test('Renders import modal', () => {
    const { container } = renderWithI18n(<ImportModal {...testProps} />);

    expect(container.firstChild).toMatchSnapshot();
  });
});
