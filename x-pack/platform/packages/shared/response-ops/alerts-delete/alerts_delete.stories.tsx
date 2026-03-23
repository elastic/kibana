/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { StoryObj } from '@storybook/react';
import { EuiButton } from '@elastic/eui';
import { EuiFlyout, EuiFlyoutBody } from '@elastic/eui';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { AlertDeleteDescriptiveFormGroup } from './components/descriptive_form_group';
import { AlertDeleteModal } from './components/modal';

const http = {
  get: async (path: string, { query }: { query?: Record<string, string> } = { query: {} }) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (path.includes('_alert_delete_preview')) {
      if (query && parseInt(query.active_alert_delete_threshold, 10) > 30) {
        return Promise.resolve({
          affected_alert_count: Math.floor(parseInt(query.active_alert_delete_threshold, 10)),
        });
      }
      return Promise.resolve({
        affected_alert_count: 0,
      });
    }
    if (path.includes('_alert_delete_last_run')) {
      return Promise.resolve({
        last_run: new Date().toISOString(),
      });
    }
    throw new Error('Not implemented');
  },
  post: async (path: string, { body }: { body?: Record<string, unknown> }) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (path.includes('_alert_delete')) {
      return Promise.resolve();
    }
  },
} as unknown as HttpStart;

const meta = {
  title: 'alertDelete',
};

export default meta;

const notifications = {
  toasts: {
    addSuccess: (...params: unknown[]) => {
      alert(`Success: ${JSON.stringify(params)}`);
    },
    addDanger: (...params: unknown[]) => {
      alert(`Danger: ${JSON.stringify(params)}`);
    },
  },
} as unknown as NotificationsStart;

const DefaultStory = ({ isDisabled = false }: { isDisabled?: boolean }) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(true);
  const closeFlyout = () => setIsFlyoutVisible(false);
  const showFlyout = () => setIsFlyoutVisible(true);

  return isFlyoutVisible ? (
    <EuiFlyout type="push" onClose={closeFlyout} maxWidth={440}>
      <EuiFlyoutBody>
        <AlertDeleteDescriptiveFormGroup
          services={{ http, notifications }}
          isDisabled={isDisabled}
          categoryIds={['management']}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : (
    <EuiButton onClick={showFlyout}>Click Me!</EuiButton>
  );
};

export const RuleSettingsFlyout: StoryObj<typeof DefaultStory> = {
  args: {
    isDisabled: false,
  },
  argTypes: {
    isDisabled: {
      control: 'boolean',
      description: 'Controls the disabled state',
    },
  },
  render: DefaultStory,
};

const ModalOnlyStory = ({ isDisabled = false }: { isDisabled?: boolean }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const hideModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  return isModalVisible ? (
    <AlertDeleteModal
      services={{ http, notifications }}
      isVisible={isModalVisible}
      onCloseModal={hideModal}
      isDisabled={isDisabled}
      categoryIds={['observability']}
    />
  ) : (
    <EuiButton onClick={showModal}>Open Modal</EuiButton>
  );
};

export const ModalOnly: StoryObj<typeof AlertDeleteModal> = {
  args: {
    isDisabled: false,
  },
  argTypes: {
    isDisabled: {
      control: 'boolean',
      description: 'Controls the disabled state',
    },
  },
  render: ModalOnlyStory,
};
