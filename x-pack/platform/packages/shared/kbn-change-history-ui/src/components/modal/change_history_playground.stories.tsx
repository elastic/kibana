/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChangeHistoryModal, ChangeHistoryProvider, ChangeHistoryTrigger } from '../../..';
import {
  createMockChangeHistoryAdapter,
  createMockChangeHistoryDetails,
  MOCK_CHANGE_HISTORY_OBJECT_ID,
} from '../../../mocks';

const scope = {
  module: 'stack',
  dataset: 'documents',
  objectType: 'document',
} as const;

const Playground = ({ restore = false, empty = false }: { restore?: boolean; empty?: boolean }) => {
  const adapter = React.useMemo(
    () =>
      createMockChangeHistoryAdapter({
        changes: empty ? [] : createMockChangeHistoryDetails(),
        ...(restore
          ? {
              onRestoreChange: async () => {},
            }
          : {}),
      }),
    [empty, restore]
  );

  return (
    <ChangeHistoryProvider
      objectId={MOCK_CHANGE_HISTORY_OBJECT_ID}
      adapter={adapter}
      labels={{ previewTitle: 'Example document' }}
      scope={scope}
      features={{ restore, compare: true }}
      permissions={{ canRestore: restore }}
      renderPreview={({ change }) => (
        <pre style={{ margin: 0 }}>{JSON.stringify(change.snapshot, null, 2)}</pre>
      )}
    >
      <ChangeHistoryTrigger />
      <ChangeHistoryModal />
    </ChangeHistoryProvider>
  );
};

const meta: Meta<typeof Playground> = {
  title: 'change-history-ui/Playground',
  component: Playground,
};

export default meta;

type Story = StoryObj<typeof Playground>;

export const Default: Story = {};

export const WithRestore: Story = {
  args: {
    restore: true,
  },
};

export const EmptyHistory: Story = {
  args: {
    empty: true,
  },
};
