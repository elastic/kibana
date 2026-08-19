/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { TransformListRow } from '../../../../common';
import { ProjectScopeActionModal } from './project_scope_action_modal';
import type { ProjectScopeAction } from './use_project_scope_action';

const createTransformItem = (id: string) =>
  ({
    id,
    config: {
      id,
      source: { index: ['source-index'] },
      dest: { index: 'dest-index' },
    },
  } as unknown as TransformListRow);

const transformItem = createTransformItem('transform-1');

const renderModal = ({
  closeModal = jest.fn(),
  confirmAndCloseModal = jest.fn(),
  items = [transformItem],
}: {
  closeModal?: jest.Mock;
  confirmAndCloseModal?: jest.Mock;
  items?: TransformListRow[];
} = {}) => {
  render(
    <ProjectScopeActionModal
      {...({
        availableProjects: [
          {
            _id: 'origin-project',
            _alias: 'Origin project',
            _type: 'security',
            _organisation: 'elastic',
          },
          {
            _id: 'linked-project',
            _alias: 'Linked project',
            _type: 'observability',
            _organisation: 'elastic',
          },
        ],
        closeModal,
        confirmAndCloseModal,
        items,
        originProjectId: 'origin-project',
        targetProjectRouting: '_id:linked-project',
      } as unknown as ProjectScopeAction)}
    />
  );

  return { closeModal, confirmAndCloseModal };
};

describe('ProjectScopeActionModal', () => {
  it('renders affected transforms and confirms the project scope update', async () => {
    const { confirmAndCloseModal } = renderModal();

    expect(screen.getByText('Change project scope for 1 transform?')).toBeInTheDocument();
    expect(screen.getByText('transform-1')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Yes, save' }));

    expect(confirmAndCloseModal).toHaveBeenCalledTimes(1);
  });

  it('cancels without confirming the project scope update', async () => {
    const { closeModal, confirmAndCloseModal } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(closeModal).toHaveBeenCalledTimes(1);
    expect(confirmAndCloseModal).not.toHaveBeenCalled();
  });

  it('renders all affected transforms in a scrollable list', () => {
    const items = Array.from({ length: 8 }, (_, index) =>
      createTransformItem(`transform-${index + 1}`)
    );

    renderModal({ items });

    expect(screen.getByTestId('transformBulkProjectScopeModalTransformList')).toBeInTheDocument();
    expect(screen.getByText('transform-1')).toBeInTheDocument();
    expect(screen.getByText('transform-7')).toBeInTheDocument();
    expect(screen.getByText('transform-8')).toBeInTheDocument();
  });
});
