/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiModal, useGeneratedHtmlId } from '@elastic/eui';
import { AFFECTED_MODAL_WIDTH } from '../modals/confirm_modal';
import { ModalStory } from '../test_utils/modal_story';
import type { ErrorDetailsModalContentProps } from './error_details';
import { ErrorDetailsModalContent } from './error_details';

type StoryArgs = Omit<ErrorDetailsModalContentProps, 'titleId'>;

// In Kibana, the modal service draws the modal around the content.
const ErrorDetailsModal = ({ onClose, ...args }: StoryArgs) => {
  const titleId = useGeneratedHtmlId();
  return (
    <EuiModal onClose={onClose} aria-labelledby={titleId} maxWidth={AFFECTED_MODAL_WIDTH}>
      <ErrorDetailsModalContent {...args} titleId={titleId} onClose={onClose} />
    </EuiModal>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'Search boost/Modals/Error details',
  render: ({ onClose, onRetry, ...args }) => (
    <ModalStory
      buttonLabel="View details"
      renderModal={(close) => (
        <ErrorDetailsModal
          {...args}
          onClose={() => {
            onClose();
            close();
          }}
          onRetry={
            onRetry &&
            (() => {
              onRetry();
              close();
            })
          }
        />
      )}
    />
  ),
  args: {
    description:
      "Couldn't delete 2 of the 3 rules that use it, so the profile was kept. You can try again.",
    nameColumn: 'Boost rule',
    failures: [
      { name: 'catalog-search', status: '504 Gateway Timeout', reason: 'Request timed out' },
      {
        name: 'catalog-staging',
        status: '403 Forbidden',
        reason: 'action [cluster:admin/boost/rule/delete] is unauthorized for user [viewer]',
      },
    ],
    onClose: action('onClose'),
    onRetry: action('onRetry'),
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const SeveralFailures: Story = {};

export const OneFailure: Story = {
  args: {
    description: 'An error prevented this profile from being deleted. You can try again.',
    nameColumn: undefined,
    failures: [{ status: '409 Conflict', reason: 'Boost profile [catalog-fast] is in use' }],
  },
};

export const CannotRetry: Story = {
  args: {
    description: "Elastic manages this profile, so it can't be deleted.",
    nameColumn: undefined,
    failures: [{ status: '400 Bad Request', reason: 'Cannot delete a builtin boost profile' }],
    onRetry: undefined,
  },
};
