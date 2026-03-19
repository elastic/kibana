/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import type { TransformListRow } from '../../../../common';
import type { DeleteActionNameProps } from './delete_action_name';
import { DeleteActionName, isDeleteActionDisabled } from './delete_action_name';
import { TRANSFORM_STATE } from '../../../../../../common/constants';
import { isDeletionProtectedTransform } from '../../../../common/managed_transforms_utils';

jest.mock('../../../../app_dependencies');

const deletionProtectedTransformItem = {
  id: 'deletion-protected-transform',
  config: {
    id: 'deletion-protected-transform',
    source: { index: ['source-index'] },
    dest: { index: 'dest-index' },
    _meta: { deletion_protected: true },
  },
  stats: {
    id: 'deletion-protected-transform',
    state: TRANSFORM_STATE.STOPPED,
    checkpointing: { last: {} },
    health: { status: 'green' },
  },
} as unknown as TransformListRow;

const managedTransformItem = {
  id: 'managed-transform',
  config: {
    id: 'managed-transform',
    source: { index: ['source-index'] },
    dest: { index: 'dest-index' },
    _meta: { managed: true },
  },
  stats: {
    id: 'managed-transform',
    state: TRANSFORM_STATE.STOPPED,
    checkpointing: { last: {} },
    health: { status: 'green' },
  },
} as unknown as TransformListRow;

describe('Transform: Transform List Actions <DeleteAction />', () => {
  test('Minimal initialization', () => {
    const props: DeleteActionNameProps = {
      items: [],
      canDeleteTransform: true,
      disabled: false,
      isBulkAction: false,
      forceDisable: false,
    };

    const { container } = render(<DeleteActionName {...props} />);
    expect(container.textContent).toBe('Delete');
  });

  test('Managed transform: isDeleteActionDisabled returns true', () => {
    expect(isDeleteActionDisabled([managedTransformItem], false)).toBe(true);
  });

  test('Managed transform (single): renders tooltip with managed restriction message', () => {
    const props: DeleteActionNameProps = {
      items: [managedTransformItem],
      canDeleteTransform: true,
      disabled: true,
      isBulkAction: false,
      forceDisable: false,
    };

    const { container } = render(<DeleteActionName {...props} />);
    expect(container.textContent).toContain('Delete');
  });

  test('Managed transform (bulk): renders tooltip with bulk managed restriction message', () => {
    const props: DeleteActionNameProps = {
      items: [managedTransformItem, managedTransformItem],
      canDeleteTransform: true,
      disabled: true,
      isBulkAction: true,
      forceDisable: false,
    };

    const { container } = render(<DeleteActionName {...props} />);
    expect(container.textContent).toContain('Delete');
  });

  test('Deletion-protected transform: isDeletionProtectedTransform returns true', () => {
    expect(isDeletionProtectedTransform(deletionProtectedTransformItem)).toBe(true);
  });

  test('Deletion-protected transform: isDeleteActionDisabled returns true', () => {
    expect(isDeleteActionDisabled([deletionProtectedTransformItem], false)).toBe(true);
  });

  test('Deletion-protected transform (single): renders tooltip with managed restriction message', () => {
    const props: DeleteActionNameProps = {
      items: [deletionProtectedTransformItem],
      canDeleteTransform: true,
      disabled: true,
      isBulkAction: false,
      forceDisable: false,
    };

    const { container } = render(<DeleteActionName {...props} />);
    expect(container.textContent).toContain('Delete');
  });
});
