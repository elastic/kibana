/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import { AttachmentTypeFilter } from './attachment_type_filter';
import { UnifiedAttachmentTypeRegistry } from '../../../client/attachment_framework/unified_attachment_registry';
import { renderWithTestingProviders } from '../../../common/mock';
import { basicCase, alertComment } from '../../../containers/mock';
import type { CaseUI } from '../../../../common';

const platinumLicense = licensingMock.createLicense({ license: { type: 'platinum' } });
const basicLicense = licensingMock.createLicense({ license: { type: 'basic' } });

const buildRegistry = () => {
  const registry = new UnifiedAttachmentTypeRegistry();
  registry.register({
    id: 'comment',
    displayName: 'Comment',
    icon: 'editorComment',
    getAttachmentViewObject: () => ({ event: 'added a comment' }),
    schemaValidator: () => {},
  });
  registry.register({
    id: 'security.alert',
    displayName: 'Alert',
    icon: 'bell',
    getAttachmentViewObject: () => ({ event: 'added an alert' }),
    schemaValidator: () => {},
  });
  registry.register({
    id: 'security.event',
    displayName: 'Event',
    icon: 'bell',
    getAttachmentViewObject: () => ({ event: 'added an event' }),
    schemaValidator: () => {},
  });
  registry.register({
    id: 'observability.alert',
    displayName: 'Alert',
    icon: 'bell',
    getAttachmentViewObject: () => ({ event: 'added an alert' }),
    schemaValidator: () => {},
  });
  return registry;
};

// Builds a CaseUI whose comments include both a user comment (→ `comment`) and a
// security alert (→ `security.alert`). `observability.alert` is intentionally
// not present so we can assert it gets filtered out of the options.
const caseWithAlerts: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertComment],
};

const caseWithObservables: CaseUI = {
  ...caseWithAlerts,
  observables: [
    {
      id: 'obs-1',
      value: '1.1.1.1',
      typeKey: 'ipv4',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      description: null,
    },
  ],
};

describe('AttachmentTypeFilter', () => {
  const onAttachmentTypesChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the trigger button', () => {
    renderWithTestingProviders(
      <AttachmentTypeFilter
        caseData={caseWithAlerts}
        selectedAttachmentTypes={[]}
        onAttachmentTypesChange={onAttachmentTypesChange}
      />,
      { wrapperProps: { unifiedAttachmentTypeRegistry: buildRegistry() } }
    );

    expect(screen.getByTestId('options-filter-popover-button-attachmentType')).toBeInTheDocument();
  });

  it('lists only attachment types present in the case, sorted by display name', async () => {
    renderWithTestingProviders(
      <AttachmentTypeFilter
        caseData={caseWithAlerts}
        selectedAttachmentTypes={[]}
        onAttachmentTypesChange={onAttachmentTypesChange}
      />,
      {
        wrapperProps: {
          unifiedAttachmentTypeRegistry: buildRegistry(),
          license: basicLicense,
        },
      }
    );

    await userEvent.click(screen.getByTestId('options-filter-popover-button-attachmentType'));

    expect(
      await screen.findByTestId('options-filter-popover-item-security.alert')
    ).toBeInTheDocument();
    // Registered but not present in the case → filtered out.
    expect(
      screen.queryByTestId('options-filter-popover-item-security.event')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('options-filter-popover-item-observability.alert')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('options-filter-popover-item-observables')).not.toBeInTheDocument();

    // User comment maps to the `comment` registry id; alert maps to `security.alert`.
    // Sorted alphabetically by display name: "Alert" < "Comment".
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute(
      'data-test-subj',
      'options-filter-popover-item-security.alert'
    );
    expect(options[1]).toHaveAttribute('data-test-subj', 'options-filter-popover-item-comment');
  });

  it('shows the Observables option when the feature is enabled and the case has observables', async () => {
    renderWithTestingProviders(
      <AttachmentTypeFilter
        caseData={caseWithObservables}
        selectedAttachmentTypes={[]}
        onAttachmentTypesChange={onAttachmentTypesChange}
      />,
      {
        wrapperProps: {
          unifiedAttachmentTypeRegistry: buildRegistry(),
          license: platinumLicense,
        },
      }
    );

    await userEvent.click(screen.getByTestId('options-filter-popover-button-attachmentType'));

    expect(
      await screen.findByTestId('options-filter-popover-item-observables')
    ).toBeInTheDocument();
  });

  it('hides the Observables option when the case has no observables', async () => {
    renderWithTestingProviders(
      <AttachmentTypeFilter
        caseData={caseWithAlerts}
        selectedAttachmentTypes={[]}
        onAttachmentTypesChange={onAttachmentTypesChange}
      />,
      {
        wrapperProps: {
          unifiedAttachmentTypeRegistry: buildRegistry(),
          license: platinumLicense,
        },
      }
    );

    await userEvent.click(screen.getByTestId('options-filter-popover-button-attachmentType'));

    await screen.findByTestId('options-filter-popover-item-security.alert');
    expect(screen.queryByTestId('options-filter-popover-item-observables')).not.toBeInTheDocument();
  });

  it('calls onAttachmentTypesChange with the selected option key when toggled on', async () => {
    renderWithTestingProviders(
      <AttachmentTypeFilter
        caseData={caseWithAlerts}
        selectedAttachmentTypes={[]}
        onAttachmentTypesChange={onAttachmentTypesChange}
      />,
      { wrapperProps: { unifiedAttachmentTypeRegistry: buildRegistry() } }
    );

    await userEvent.click(screen.getByTestId('options-filter-popover-button-attachmentType'));
    await userEvent.click(await screen.findByTestId('options-filter-popover-item-security.alert'));

    await waitFor(() => {
      expect(onAttachmentTypesChange).toHaveBeenCalledWith(['security.alert']);
    });
  });

  it('omits excluded type ids from the dropdown', async () => {
    renderWithTestingProviders(
      <AttachmentTypeFilter
        caseData={caseWithAlerts}
        selectedAttachmentTypes={[]}
        onAttachmentTypesChange={onAttachmentTypesChange}
        excludedTypes={['comment']}
      />,
      { wrapperProps: { unifiedAttachmentTypeRegistry: buildRegistry() } }
    );

    await userEvent.click(screen.getByTestId('options-filter-popover-button-attachmentType'));

    expect(
      await screen.findByTestId('options-filter-popover-item-security.alert')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('options-filter-popover-item-comment')).not.toBeInTheDocument();
  });

  it('omits the observables option when observables is in excludedTypes', async () => {
    renderWithTestingProviders(
      <AttachmentTypeFilter
        caseData={caseWithObservables}
        selectedAttachmentTypes={[]}
        onAttachmentTypesChange={onAttachmentTypesChange}
        excludedTypes={['observables']}
      />,
      {
        wrapperProps: {
          unifiedAttachmentTypeRegistry: buildRegistry(),
          license: platinumLicense,
        },
      }
    );

    await userEvent.click(screen.getByTestId('options-filter-popover-button-attachmentType'));

    await screen.findByTestId('options-filter-popover-item-security.alert');
    expect(screen.queryByTestId('options-filter-popover-item-observables')).not.toBeInTheDocument();
  });
});
