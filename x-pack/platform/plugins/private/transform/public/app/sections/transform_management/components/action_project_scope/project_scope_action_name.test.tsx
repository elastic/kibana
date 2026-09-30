/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import type { TransformListRow } from '../../../../common';
import {
  getProjectScopeActionDisabledMessage,
  isProjectScopeActionDisabled,
  ProjectScopeActionName,
} from './project_scope_action_name';

const transformItem = {
  id: 'transform-1',
  config: {
    id: 'transform-1',
    source: { index: ['source-index'] },
    dest: { index: 'dest-index' },
  },
} as unknown as TransformListRow;

describe('Transform: Transform List Actions <ProjectScopeAction />', () => {
  it('renders the project scope action label', () => {
    const { container } = render(
      <ProjectScopeActionName
        canCreateTransform={true}
        disabled={false}
        hasLinkedProjects={true}
        isCpsEnabled={true}
        isLoading={false}
        items={[transformItem]}
      />
    );

    expect(container.textContent).toBe('Change project scope');
  });

  it('disables the action when CPS is unavailable', () => {
    expect(
      isProjectScopeActionDisabled({
        canCreateTransform: true,
        hasLinkedProjects: true,
        isCpsEnabled: false,
        isLoading: false,
        items: [transformItem],
      })
    ).toBe(true);
    expect(
      getProjectScopeActionDisabledMessage({
        canCreateTransform: true,
        hasLinkedProjects: true,
        isCpsEnabled: false,
        isLoading: false,
        items: [transformItem],
      })
    ).toBe('Project scope is unavailable.');
  });

  it('disables the action when the user cannot update transforms', () => {
    expect(
      isProjectScopeActionDisabled({
        canCreateTransform: false,
        hasLinkedProjects: true,
        isCpsEnabled: true,
        isLoading: false,
        items: [transformItem],
      })
    ).toBe(true);
    expect(
      getProjectScopeActionDisabledMessage({
        canCreateTransform: false,
        hasLinkedProjects: true,
        isCpsEnabled: true,
        isLoading: false,
        items: [transformItem],
      })
    ).toBe('You do not have permission to create transforms. Please contact your administrator.');
  });
});
