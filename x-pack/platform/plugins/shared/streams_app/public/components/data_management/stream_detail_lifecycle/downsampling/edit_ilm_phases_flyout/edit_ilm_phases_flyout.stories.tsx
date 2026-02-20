/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React, { useMemo, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import { EditIlmPhasesFlyout } from './edit_ilm_phases_flyout';
import { IlmPhaseSelect } from '../ilm_phase_select/ilm_phase_select';
import { ILM_PHASE_ORDER } from './constants';

const getInitialSelectedPhase = (phases: IlmPolicyPhases): PhaseName | undefined =>
  ILM_PHASE_ORDER.find((p) => Boolean((phases as Record<string, unknown>)[p]));

const addPhaseOutsideFlyout = (
  prev: IlmPolicyPhases,
  phase: PhaseName,
  searchableSnapshotRepositories: string[]
): IlmPolicyPhases => {
  if ((prev as Record<string, unknown>)[phase]) return prev;

  switch (phase) {
    case 'hot':
      return {
        ...prev,
        hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
      };
    case 'warm':
      return {
        ...prev,
        warm: { name: 'warm', size_in_bytes: 0, min_age: '30d' },
      };
    case 'cold':
      return {
        ...prev,
        cold: { name: 'cold', size_in_bytes: 0, min_age: '30d' },
      };
    case 'frozen':
      return {
        ...prev,
        frozen: {
          name: 'frozen',
          size_in_bytes: 0,
          min_age: '30d',
          ...(searchableSnapshotRepositories.length > 0
            ? { searchable_snapshot: searchableSnapshotRepositories[0] }
            : {}),
        },
      };
    case 'delete':
      return {
        ...prev,
        delete: { name: 'delete', min_age: '30d' },
      };
    default:
      return prev;
  }
};

const meta: Meta<typeof EditIlmPhasesFlyout> = {
  component: EditIlmPhasesFlyout,
  title: 'streams/EditIlmPhasesFlyout',
  argTypes: {
    canCreateRepository: { control: 'boolean' },
    searchableSnapshotRepositories: { control: 'object' },
    isLoadingSearchableSnapshotRepositories: { control: 'boolean' },
    initialPhases: { control: false },
    selectedPhase: { control: false },
    setSelectedPhase: { control: false },
    onChange: { control: false },
    onSave: { control: false },
    onClose: { control: false },
    onRefreshSearchableSnapshotRepositories: { control: false },
    onCreateSnapshotRepository: { control: false },
    isSaving: { control: false },
    'data-test-subj': { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof EditIlmPhasesFlyout>;

export const Default: Story = {
  args: {
    canCreateRepository: true,
    searchableSnapshotRepositories: ['found-snapshots', 'another-repo'],
  },
  render: (args) => {
    const StoryComponent = () => {
      const initialPhases: IlmPolicyPhases = {
        hot: {
          name: 'hot',
          size_in_bytes: 0,
          rollover: {
            max_age: '30d',
            max_primary_shard_size: '50gb',
          },
        },
        warm: {
          name: 'warm',
          size_in_bytes: 0,
          min_age: '30d',
          downsample: { after: '30d', fixed_interval: '1h' },
          readonly: true,
        },
        cold: {
          name: 'cold',
          size_in_bytes: 0,
          min_age: '40d',
          downsample: { after: '40d', fixed_interval: '5d' },
        },
        frozen: {
          name: 'frozen',
          size_in_bytes: 0,
          min_age: '50d',
          searchable_snapshot: 'found-snapshots',
        },
      };
      const [selectedPhase, setSelectedPhase] = useState<PhaseName | undefined>(() =>
        getInitialSelectedPhase(initialPhases)
      );

      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EditIlmPhasesFlyout
              initialPhases={initialPhases}
              selectedPhase={selectedPhase}
              setSelectedPhase={setSelectedPhase}
              canCreateRepository={args.canCreateRepository}
              searchableSnapshotRepositories={args.searchableSnapshotRepositories}
              onRefreshSearchableSnapshotRepositories={() =>
                action('onRefreshSearchableSnapshots')()
              }
              onCreateSnapshotRepository={() => action('onCreateSnapshotRepository')()}
              onClose={() => {
                action('onClose')();
              }}
              onChange={(next) => {
                action('onChange')(next);
              }}
              onSave={(next) => {
                action('onSave')(next);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };
    return <StoryComponent />;
  },
};

export const PreserveMsUnits: Story = {
  render: () => {
    const StoryComponent = () => {
      const initialPhases: IlmPolicyPhases = {
        hot: {
          name: 'hot',
          size_in_bytes: 0,
          rollover: {},
        },
        warm: {
          name: 'warm',
          size_in_bytes: 0,
          min_age: '1500ms',
          downsample: { after: '1500ms', fixed_interval: '1500ms' },
        },
      } as any;

      const [selectedPhase, setSelectedPhase] = useState<PhaseName | undefined>('warm');

      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EditIlmPhasesFlyout
              initialPhases={initialPhases}
              selectedPhase={selectedPhase}
              setSelectedPhase={setSelectedPhase}
              searchableSnapshotRepositories={['found-snapshots', 'another-repo']}
              onRefreshSearchableSnapshotRepositories={() =>
                action('onRefreshSearchableSnapshots')()
              }
              onCreateSnapshotRepository={() => action('onCreateSnapshotRepository')()}
              onClose={() => {
                action('onClose')();
              }}
              onChange={(next) => {
                action('onChange')(next);
              }}
              onSave={(next) => {
                action('onSave')(next);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };

    return <StoryComponent />;
  },
};

export const WarmAndDeletePhases: Story = {
  render: () => {
    const StoryComponent = () => {
      const initialPhases: IlmPolicyPhases = {
        warm: {
          name: 'warm',
          size_in_bytes: 0,
          min_age: '30d',
          readonly: true,
        },
        delete: {
          name: 'delete',
          min_age: '60d',
          delete_searchable_snapshot: true,
        },
      };
      const [selectedPhase, setSelectedPhase] = useState<PhaseName | undefined>(() =>
        getInitialSelectedPhase(initialPhases)
      );

      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EditIlmPhasesFlyout
              initialPhases={initialPhases}
              selectedPhase={selectedPhase}
              setSelectedPhase={setSelectedPhase}
              searchableSnapshotRepositories={['found-snapshots', 'another-repo']}
              onRefreshSearchableSnapshotRepositories={() =>
                action('onRefreshSearchableSnapshots')()
              }
              onCreateSnapshotRepository={() => action('onCreateSnapshotRepository')()}
              onClose={() => {
                action('onClose')();
              }}
              onChange={(next) => {
                action('onChange')(next);
              }}
              onSave={(next) => {
                action('onSave')(next);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };
    return <StoryComponent />;
  },
};

export const OnlyDeletePhase: Story = {
  render: () => {
    const StoryComponent = () => {
      const initialPhases: IlmPolicyPhases = {
        delete: {
          name: 'delete',
          min_age: '60d',
          delete_searchable_snapshot: true,
        },
      };
      const [selectedPhase, setSelectedPhase] = useState<PhaseName | undefined>(() =>
        getInitialSelectedPhase(initialPhases)
      );

      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EditIlmPhasesFlyout
              initialPhases={initialPhases}
              selectedPhase={selectedPhase}
              setSelectedPhase={setSelectedPhase}
              searchableSnapshotRepositories={['found-snapshots', 'another-repo']}
              onRefreshSearchableSnapshotRepositories={() =>
                action('onRefreshSearchableSnapshots')()
              }
              onCreateSnapshotRepository={() => action('onCreateSnapshotRepository')()}
              onClose={() => {
                action('onClose')();
              }}
              onChange={(next) => {
                action('onChange')(next);
              }}
              onSave={(next) => {
                action('onSave')(next);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };
    return <StoryComponent />;
  },
};

export const PhaseSyncing: Story = {
  args: {
    canCreateRepository: true,
    searchableSnapshotRepositories: ['found-snapshots', 'another-repo'],
  },
  render: (args) => {
    const StoryComponent = () => {
      const [isOpen, setIsOpen] = useState(false);
      const [phases, setPhases] = useState<IlmPolicyPhases>({
        hot: {
          name: 'hot',
          size_in_bytes: 0,
          rollover: {
            max_age: '30d',
            max_primary_shard_size: '50gb',
          },
        },
      });
      const [phaseToOpen, setPhaseToOpen] = useState<PhaseName | undefined>('warm');

      const enabledPhases = useMemo(() => {
        const present = Object.keys(phases) as PhaseName[];
        return ILM_PHASE_ORDER.filter((p) => present.includes(p));
      }, [phases]);

      const selectPhase = (phase: PhaseName) => {
        setPhaseToOpen(phase);
        setIsOpen(true);
      };

      const repositories = args.searchableSnapshotRepositories ?? [];
      const canSelectFrozen = Boolean(args.canCreateRepository) || repositories.length > 0;
      const excludedPhases = canSelectFrozen ? [] : (['frozen'] as PhaseName[]);

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
              excludedPhases={excludedPhases}
              onSelect={(phase) => {
                setPhases((prev) => addPhaseOutsideFlyout(prev, phase, repositories));
                selectPhase(phase);
              }}
              renderButton={(buttonProps) => (
                <EuiButton {...buttonProps} size="s" iconType="arrowDown" iconSide="right">
                  Add phase & open flyout
                </EuiButton>
              )}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
            {isOpen ? (
              <EditIlmPhasesFlyout
                initialPhases={phases}
                selectedPhase={phaseToOpen}
                setSelectedPhase={setPhaseToOpen}
                canCreateRepository={args.canCreateRepository}
                searchableSnapshotRepositories={repositories}
                isLoadingSearchableSnapshotRepositories={
                  args.isLoadingSearchableSnapshotRepositories
                }
                onRefreshSearchableSnapshotRepositories={() =>
                  action('onRefreshSearchableSnapshots')()
                }
                onCreateSnapshotRepository={() => action('onCreateSnapshotRepository')()}
                onClose={() => {
                  action('onClose')();
                  setIsOpen(false);
                }}
                onChange={(next) => {
                  action('onChange')(next);
                  setPhases(next);
                }}
                onSave={(next) => {
                  action('onSave')(next);
                  setPhases(next);
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
