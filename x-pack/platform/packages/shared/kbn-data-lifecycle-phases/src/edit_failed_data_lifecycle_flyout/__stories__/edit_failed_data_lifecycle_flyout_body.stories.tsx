/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FlyoutWithTabs } from '../../flyout_with_tabs';
import { FlyoutFooterWithRetentionWarning } from '../../flyout_footer_with_retention_warning';
import { EditFailedDataLifecycleFlyoutBody } from '../edit_failed_data_lifecycle_flyout_body';
import { buildFailedDataLifecycleApplyPayload } from '../types';

// ---------------------------------------------------------------------------
// Shell components matching each consumer's structure
// ---------------------------------------------------------------------------

const IndexManagementFlyoutShell = ({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <FlyoutWithTabs
    title={title}
    tabsAriaLabel="Data lifecycle tabs"
    tabs={[{ id: 'failed_data', label: 'Failed data' }]}
    initialTabId="failed_data"
    onClose={onClose}
    size={400}
    type="overlay"
  >
    {() => children}
  </FlyoutWithTabs>
);

const StreamsFlyoutShell = ({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'streamsFailedDataFlyoutTitle' });
  const { euiTheme } = useEuiTheme();
  const headerContentStyles = css`
    padding: ${euiTheme.size.l};
  `;

  return (
    <EuiFlyout
      onClose={onClose}
      size={400}
      ownFocus
      paddingSize="none"
      aria-labelledby={titleId}
      type="push"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          responsive={false}
          css={headerContentStyles}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2 id={titleId}>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      {children}
    </EuiFlyout>
  );
};

const PlainFlyoutFooter = ({
  onCancel,
  onApply,
  isApplyDisabled,
}: {
  onCancel: () => void;
  onApply: () => void;
  isApplyDisabled?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.m} ${euiTheme.size.l};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCancel} flush="left">
            Cancel
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={onApply} disabled={isApplyDisabled}>
            Apply
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};

const FailedDataRetentionInput = ({
  disabled,
  value,
  onChange,
}: {
  disabled: boolean;
  value: string;
  onChange: (next: string) => void;
}) => {
  const id = useGeneratedHtmlId({ prefix: 'failedRetention' });
  return (
    <EuiFieldText
      id={id}
      fullWidth
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="e.g. 60d"
    />
  );
};

// ===========================================================================
// INDEX MANAGEMENT STORIES
// ===========================================================================

const IndexManagementDefaultStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(false);
  const [failureStoreEnabled, setFailureStoreEnabled] = useState(true);
  const [retention, setRetention] = useState('60d');

  const onClose = () => {
    action('onClose')();
    setIsOpen(false);
  };

  const onCancel = () => {
    action('onCancel')();
    setIsOpen(false);
  };

  const onApply = () => {
    action('onApply')(
      buildFailedDataLifecycleApplyPayload({
        inheritLifecycle,
        failureStoreEnabled,
        retention,
      })
    );
    setIsOpen(false);
  };

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <IndexManagementFlyoutShell title="Edit data lifecycle" onClose={onClose}>
      <EditFailedDataLifecycleFlyoutBody
        inherit={{
          value: inheritLifecycle,
          onChange: setInheritLifecycle,
          label: 'Inherit lifecycle from index template',
          link: { href: '#', label: 'View index template' },
        }}
        failureStore={{ value: failureStoreEnabled, onChange: setFailureStoreEnabled }}
        retentionContent={
          <FailedDataRetentionInput
            disabled={inheritLifecycle}
            value={retention}
            onChange={setRetention}
          />
        }
      />
      <PlainFlyoutFooter onCancel={onCancel} onApply={onApply} />
    </IndexManagementFlyoutShell>
  );
};

export const IndexManagementDefault: StoryObj = {
  name: 'Index Management — default',
  render: () => <IndexManagementDefaultStory />,
};

const IndexManagementInheritingStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(true);
  const [failureStoreEnabled, setFailureStoreEnabled] = useState(true);
  const [retention, setRetention] = useState('60d');

  const onClose = () => {
    action('onClose')();
    setIsOpen(false);
  };

  const onCancel = () => {
    action('onCancel')();
    setIsOpen(false);
  };

  const onApply = () => {
    action('onApply')(
      buildFailedDataLifecycleApplyPayload({
        inheritLifecycle,
        failureStoreEnabled,
        retention,
      })
    );
    setIsOpen(false);
  };

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <IndexManagementFlyoutShell title="Edit failed ingest lifecycle" onClose={onClose}>
      <EditFailedDataLifecycleFlyoutBody
        inherit={{
          value: inheritLifecycle,
          onChange: setInheritLifecycle,
          label: 'Inherit lifecycle from index template',
          link: { href: '#', label: 'View index template' },
        }}
        failureStore={{ value: failureStoreEnabled, onChange: setFailureStoreEnabled }}
        retentionContent={
          <FailedDataRetentionInput
            disabled={inheritLifecycle}
            value={retention}
            onChange={setRetention}
          />
        }
      />
      <PlainFlyoutFooter onCancel={onCancel} onApply={onApply} isApplyDisabled={inheritLifecycle} />
    </IndexManagementFlyoutShell>
  );
};

export const IndexManagementInheriting: StoryObj = {
  name: 'Index Management — inheriting from index template',
  render: () => <IndexManagementInheritingStory />,
};

// ===========================================================================
// STREAMS STORIES
// ===========================================================================

const StreamsClassicStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(false);
  const [failureStoreEnabled, setFailureStoreEnabled] = useState(true);

  const onClose = () => {
    action('onClose')();
    setIsOpen(false);
  };

  const onCancel = () => {
    action('onCancel')();
    setIsOpen(false);
  };

  const onApply = () => {
    action('onApply')(
      buildFailedDataLifecycleApplyPayload({
        inheritLifecycle,
        failureStoreEnabled,
      })
    );
    setIsOpen(false);
  };

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <StreamsFlyoutShell title="Edit failed data lifecycle" onClose={onClose}>
      <EditFailedDataLifecycleFlyoutBody
        inherit={{
          value: inheritLifecycle,
          onChange: setInheritLifecycle,
          label: 'Inherit lifecycle from index template',
          link: { href: '#', label: 'View index template' },
        }}
        failureStore={{ value: failureStoreEnabled, onChange: setFailureStoreEnabled }}
      />
      <FlyoutFooterWithRetentionWarning onCancel={onCancel} onApply={onApply} showWarning={false} />
    </StreamsFlyoutShell>
  );
};

export const StreamsClassic: StoryObj = {
  name: 'Streams — classic stream',
  render: () => <StreamsClassicStory />,
};

const StreamsClassicInheritingStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(true);
  const [failureStoreEnabled, setFailureStoreEnabled] = useState(true);

  const onClose = () => {
    action('onClose')();
    setIsOpen(false);
  };

  const onCancel = () => {
    action('onCancel')();
    setIsOpen(false);
  };

  const onApply = () => {
    action('onApply')(
      buildFailedDataLifecycleApplyPayload({
        inheritLifecycle,
        failureStoreEnabled,
      })
    );
    setIsOpen(false);
  };

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <StreamsFlyoutShell title="Edit failed data lifecycle" onClose={onClose}>
      <EditFailedDataLifecycleFlyoutBody
        inherit={{
          value: inheritLifecycle,
          onChange: setInheritLifecycle,
          label: 'Inherit lifecycle from index template',
          link: { href: '#', label: 'View index template' },
        }}
        failureStore={{ value: failureStoreEnabled, onChange: setFailureStoreEnabled }}
      />
      <FlyoutFooterWithRetentionWarning
        onCancel={onCancel}
        onApply={onApply}
        isApplyDisabled={inheritLifecycle}
        showWarning={false}
      />
    </StreamsFlyoutShell>
  );
};

export const StreamsClassicInheriting: StoryObj = {
  name: 'Streams — classic stream, inheriting from index template',
  render: () => <StreamsClassicInheritingStory />,
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof EditFailedDataLifecycleFlyoutBody> = {
  title: 'Data Lifecycle Phases / Edit Failed Data Lifecycle Flyout Body',
  component: EditFailedDataLifecycleFlyoutBody,
};

export default meta;
