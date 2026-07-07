/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { ImportModal } from './import_modal';

jest.mock('../../../../capabilities/check_capabilities', () => ({
  usePermissionCheck: () => [true, true],
}));

const testProps = {
  addImportedEvents: jest.fn(),
  closeImportModal: jest.fn(),
  canCreateCalendar: true,
};

describe('ImportModal', () => {
  test('Renders import modal', () => {
    const { container } = renderWithI18n(<ImportModal {...testProps} />);

    expect(container.firstChild).toMatchSnapshot();
  });
});
