/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { Index, PolicyFromES } from '../../../common/types';
import { loadPolicies } from '../../application/services/api';
import { AddLifecyclePolicyConfirmModal } from './add_lifecycle_confirm_modal';

vi.mock('../../application/services/api', () => {
  const mocked = {
    loadPolicies: vi.fn(),
    addLifecyclePolicyToIndex: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../application/services/api_errors', () => {
  const mocked = {
    showApiError: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../application/services/notification', () => {
  const mocked = {
    toasts: { addSuccess: vi.fn() },
  };
  return { ...mocked, default: mocked };
});

const rolloverPolicy: PolicyFromES = {
  name: 'rollover-policy',
  version: 1,
  modifiedDate: '2020-01-01T00:00:00.000Z',
  policy: {
    name: 'rollover-policy',
    phases: {
      hot: {
        min_age: '0ms',
        actions: { rollover: { max_age: '30d' } },
      },
    },
  },
};

const getUrlForApp = (appId: string, options?: { path?: string }) =>
  `${appId}/${options?.path ?? ''}`;

const renderModal = (index: Index) =>
  renderWithI18n(
    <AddLifecyclePolicyConfirmModal
      indexName={index.name}
      index={index}
      closeModal={vi.fn()}
      reloadIndices={vi.fn()}
      getUrlForApp={getUrlForApp}
    />
  );

const selectRolloverPolicy = async () => {
  // The policy select is the only combobox until a rollover policy is selected.
  const policySelect = await screen.findByRole('combobox');
  fireEvent.change(policySelect, { target: { value: rolloverPolicy.name } });
};

describe('AddLifecyclePolicyConfirmModal', () => {
  beforeEach(() => {
    (loadPolicies as Mock).mockReset();
    (loadPolicies as Mock).mockResolvedValue([rolloverPolicy]);
  });

  it('does not crash and warns when aliases is undefined and a rollover policy is selected', async () => {
    renderModal({ name: 'index-without-aliases' });

    await selectRolloverPolicy();

    expect(await screen.findByText('Index has no aliases')).toBeInTheDocument();
  });

  it('warns when aliases is the "none" sentinel and a rollover policy is selected', async () => {
    renderModal({ name: 'index-without-aliases', aliases: 'none' });

    await selectRolloverPolicy();

    expect(await screen.findByText('Index has no aliases')).toBeInTheDocument();
  });

  it('renders the rollover alias selector when the index has aliases', async () => {
    renderModal({ name: 'index-with-aliases', aliases: ['my-alias'] });

    await selectRolloverPolicy();

    expect(await screen.findByText('Index rollover alias')).toBeInTheDocument();
    expect(screen.queryByText('Index has no aliases')).not.toBeInTheDocument();
  });
});
