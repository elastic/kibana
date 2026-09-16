/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CPSProject } from '@kbn/cps-utils';

import type { TransformListRow } from '../../../../common';
import { ProjectScopeActionModal } from './project_scope_action_modal';
import type { ProjectScopeAction } from './use_project_scope_action';

const createTransformItem = (id: string, projectRouting?: string) =>
  ({
    id,
    config: {
      id,
      source: { index: ['source-index'], project_routing: projectRouting },
      dest: { index: 'dest-index' },
    },
  } as unknown as TransformListRow);

const transformItem = createTransformItem('transform-1');
const availableProjects: CPSProject[] = [
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
];

const renderModal = ({
  availableProjectsOverride = availableProjects,
  closeModal = jest.fn(),
  confirmAndCloseModal = jest.fn(),
  items = [transformItem],
  targetProjectRouting = '_id:linked-project',
}: {
  availableProjectsOverride?: CPSProject[];
  closeModal?: jest.Mock;
  confirmAndCloseModal?: jest.Mock;
  items?: TransformListRow[];
  targetProjectRouting?: string;
} = {}) => {
  render(
    <ProjectScopeActionModal
      {...({
        availableProjects: availableProjectsOverride,
        closeModal,
        confirmAndCloseModal,
        items,
        originProjectId: 'origin-project',
        targetProjectRouting,
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

  it('resolves filter expressions before calculating project scope changes', () => {
    renderModal({
      availableProjectsOverride: [
        {
          _id: 'origin-project',
          _alias: 'Origin project',
          _type: 'observability',
          _organisation: 'elastic',
        },
        {
          _id: 'security-project-1',
          _alias: 'Security project 1',
          _type: 'security',
          _organisation: 'elastic',
        },
        {
          _id: 'security-project-2',
          _alias: 'Security project 2',
          _type: 'security',
          _organisation: 'elastic',
        },
      ],
      items: [
        createTransformItem(
          'transform-1',
          '_type:security AND (_id:* AND NOT _id:security-project-2)'
        ),
      ],
      targetProjectRouting: '_type:security',
    });

    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('-0')).toBeInTheDocument();
  });
});
