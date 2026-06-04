/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { IngestStreamLifecycleDSL, PhaseName } from '@kbn/streams-schema';

import { EditDlmPhasesFlyout } from './edit_dlm_phases_flyout';
import { IlmPhaseSelect } from '../ilm_phase_select/ilm_phase_select';

const meta: Meta<typeof EditDlmPhasesFlyout> = {
  component: EditDlmPhasesFlyout,
  title: 'streams/EditDlmPhasesFlyout',
  argTypes: {
    initialDsl: { control: false },
    selectedPhase: { control: false },
    setSelectedPhase: { control: false },
    onChange: { control: false },
    onSave: { control: false },
    onClose: { control: false },
    onMissingDefaultRepository: { control: false },
    onUpgradeEnterprise: { control: false },
    isSaving: { control: false },
    'data-test-subj': { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof EditDlmPhasesFlyout>;

export const Default: Story = {
  name: 'Default',
  render: () => {
    const initialDsl: IngestStreamLifecycleDSL['dsl'] = {
      frozen_after: '30d',
      data_retention: '60d',
    };
    const StoryComponent = () => {
      const [selectedPhase, setSelectedPhase] = useState<PhaseName | undefined>('frozen');
      return (
        <EditDlmPhasesFlyout
          initialDsl={initialDsl}
          manageRepositoriesHref="#"
          defaultRepositoryName="found-snapshots"
          selectedPhase={selectedPhase}
          setSelectedPhase={setSelectedPhase}
          onClose={action('onClose')}
          onChange={(next, changeMeta) => action('onChange')({ next, meta: changeMeta })}
          onSave={(next) => action('onSave')(next)}
          onChangeDebounceMs={0}
        />
      );
    };
    return <StoryComponent />;
  },
};

export const EmptyState: Story = {
  name: 'Empty state',
  render: () => {
    const initialDsl: IngestStreamLifecycleDSL['dsl'] = {};
    const StoryComponent = () => {
      const [selectedPhase, setSelectedPhase] = useState<PhaseName | undefined>(undefined);
      return (
        <EditDlmPhasesFlyout
          initialDsl={initialDsl}
          manageRepositoriesHref="#"
          defaultRepositoryName="found-snapshots"
          selectedPhase={selectedPhase}
          setSelectedPhase={setSelectedPhase}
          onClose={action('onClose')}
          onChange={(next, changeMeta) => action('onChange')({ next, meta: changeMeta })}
          onSave={(next) => action('onSave')(next)}
          onChangeDebounceMs={0}
        />
      );
    };
    return <StoryComponent />;
  },
};

export const MissingEnterpriseLicense: Story = {
  name: 'Missing enterprise license',
  render: () => {
    const initialDsl: IngestStreamLifecycleDSL['dsl'] = {
      frozen_after: '30d',
      data_retention: '60d',
    };
    const StoryComponent = () => {
      const [selectedPhase, setSelectedPhase] = useState<PhaseName | undefined>('frozen');
      return (
        <EditDlmPhasesFlyout
          initialDsl={initialDsl}
          isMissingEnterpriseLicense={true}
          onUpgradeEnterprise={action('onUpgradeEnterprise')}
          manageRepositoriesHref="#"
          defaultRepositoryName="found-snapshots"
          selectedPhase={selectedPhase}
          setSelectedPhase={setSelectedPhase}
          onClose={action('onClose')}
          onChange={(next, changeMeta) => action('onChange')({ next, meta: changeMeta })}
          onSave={(next) => action('onSave')(next)}
          onChangeDebounceMs={0}
        />
      );
    };
    return <StoryComponent />;
  },
};

export const MissingDefaultRepository: Story = {
  name: 'Missing default repository',
  render: () => {
    const initialDsl: IngestStreamLifecycleDSL['dsl'] = {
      frozen_after: '30d',
      data_retention: '60d',
    };
    const StoryComponent = () => {
      const [selectedPhase, setSelectedPhase] = useState<PhaseName | undefined>('frozen');
      return (
        <EditDlmPhasesFlyout
          initialDsl={initialDsl}
          onMissingDefaultRepository={action('onMissingDefaultRepository')}
          onRefreshDefaultRepository={action('onRefreshDefaultRepository')}
          manageRepositoriesHref="#"
          selectedPhase={selectedPhase}
          setSelectedPhase={setSelectedPhase}
          onClose={action('onClose')}
          onChange={(next, changeMeta) => action('onChange')({ next, meta: changeMeta })}
          onSave={(next) => action('onSave')(next)}
          onChangeDebounceMs={0}
        />
      );
    };
    return <StoryComponent />;
  },
};

export const PhaseSyncing: Story = {
  name: 'Phase syncing',
  render: () => {
    const StoryComponent = () => {
      const [isOpen, setIsOpen] = useState(false);
      const [dsl, setDsl] = useState<IngestStreamLifecycleDSL['dsl']>({});
      const [phaseToOpen, setPhaseToOpen] = useState<PhaseName | undefined>('frozen');

      const enabledPhases: PhaseName[] = [
        'hot',
        ...(dsl.frozen_after ? (['frozen'] as const) : []),
        ...(dsl.data_retention ? (['delete'] as const) : []),
      ];

      const selectPhase = (phase: PhaseName) => {
        setPhaseToOpen(phase);
        setIsOpen(true);
      };

      return (
        <EuiFlexGroup direction="column" gutterSize="m" style={{ maxWidth: 560 }}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" wrap responsive={false}>
              {enabledPhases.map((p) => (
                <EuiFlexItem key={p} grow={false}>
                  <EuiButton size="s" onClick={() => selectPhase(p)}>
                    {p}
                  </EuiButton>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <IlmPhaseSelect
              selectedPhases={enabledPhases}
              excludedPhases={['hot', 'warm', 'cold']}
              onSelect={(phase) => {
                selectPhase(phase);
              }}
              renderButton={(buttonProps) => (
                <EuiButton {...buttonProps} size="s" iconType="chevronSingleDown" iconSide="right">
                  Add phase & open flyout
                </EuiButton>
              )}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
            {isOpen ? (
              <EditDlmPhasesFlyout
                initialDsl={dsl}
                defaultRepositoryName="found-snapshots"
                manageRepositoriesHref="#"
                selectedPhase={phaseToOpen}
                setSelectedPhase={setPhaseToOpen}
                onClose={() => {
                  action('onClose')();
                  setIsOpen(false);
                }}
                onChange={(next, changeMeta) => {
                  action('onChange')({ next, meta: changeMeta });
                  setDsl(next);
                }}
                onSave={(next) => {
                  action('onSave')(next);
                  setDsl(next);
                  setIsOpen(false);
                }}
              />
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };

    return <StoryComponent />;
  },
};
