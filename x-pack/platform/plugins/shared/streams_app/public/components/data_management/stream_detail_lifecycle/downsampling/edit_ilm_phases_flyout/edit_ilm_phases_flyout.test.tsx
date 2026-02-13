/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import { EditIlmPhasesFlyout } from './edit_ilm_phases_flyout';

jest.mock('../../hooks/use_ilm_phases_color_and_description', () => ({
  useIlmPhasesColorAndDescription: () => ({
    ilmPhases: {
      hot: { color: '#FF0000', description: 'Hot desc' },
      warm: { color: '#FFA500', description: 'Warm desc' },
      cold: { color: '#0000FF', description: 'Cold desc' },
      frozen: { color: '#00FFFF', description: 'Frozen desc' },
      delete: { color: '#808080', description: 'Delete desc' },
    },
  }),
}));

jest.mock('../ilm_phase_select/ilm_phase_select', () => ({
  IlmPhaseSelect: ({ onSelect, renderButton }: any) => {
    // Keep the flyout's real `renderButton` (and its data-test-subj), but make it deterministic
    // for tests: clicking the button adds the cold phase.
    const buttonProps = {
      disabled: false,
      onClick: () => onSelect('cold'),
    };
    return <div>{renderButton(buttonProps)}</div>;
  },
}));

const DATA_TEST_SUBJ = 'streamsEditIlmPhasesFlyout';

const tick = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

const getTab = (phase: string) => screen.getByTestId(`${DATA_TEST_SUBJ}Tab-${phase}`);
const queryTab = (phase: string) => screen.queryByTestId(`${DATA_TEST_SUBJ}Tab-${phase}`);
const getPanel = (phase: string) => screen.getByTestId(`${DATA_TEST_SUBJ}Panel-${phase}`);
const getPhaseContainer = (phase: string) => {
  const panel = getPanel(phase);
  const container = panel.parentElement;
  if (!container) {
    throw new Error(`Could not find phase container for "${phase}"`);
  }
  return container as HTMLElement;
};
const withinPhase = (phase: string) => within(getPhaseContainer(phase));

const renderFlyout = (
  props: Partial<React.ComponentProps<typeof EditIlmPhasesFlyout>> = {},
  options: { initialSelectedPhase?: PhaseName } = {}
) => {
  const onClose = jest.fn();
  const onChange = jest.fn();
  const onSave = jest.fn();

  const initialPhases: IlmPolicyPhases = props.initialPhases ?? {
    hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
  };

  const setSelectedPhaseRef: {
    current: ((phase: PhaseName | undefined) => void) | null;
  } = { current: null };

  const onSelectedPhaseChange = jest.fn();

  const Wrapper = () => {
    const [selectedPhase, setSelectedPhase] = React.useState<PhaseName | undefined>(
      options.initialSelectedPhase
    );
    const setSelectedPhaseProxy = (phase: PhaseName | undefined) => {
      onSelectedPhaseChange(phase);
      setSelectedPhase(phase);
    };
    setSelectedPhaseRef.current = setSelectedPhaseProxy;
    return (
      <>
        <div data-test-subj="selectedPhaseValue">{selectedPhase ?? ''}</div>
        <EditIlmPhasesFlyout
          initialPhases={initialPhases}
          selectedPhase={selectedPhase}
          setSelectedPhase={setSelectedPhaseProxy}
          searchableSnapshotRepositories={[]}
          onClose={onClose}
          onChange={onChange}
          onSave={onSave}
          {...props}
        />
      </>
    );
  };

  render(<Wrapper />);

  return {
    onClose,
    onChange,
    onSave,
    initialPhases,
    onSelectedPhaseChange,
    setSelectedPhase: (phase: PhaseName | undefined) => {
      act(() => {
        if (!setSelectedPhaseRef.current) {
          throw new Error('selected phase setter not initialized');
        }
        setSelectedPhaseRef.current(phase);
      });
    },
  };
};

describe('EditIlmPhasesFlyout', () => {
  describe('rendering and tabs', () => {
    it('renders tabs for enabled phases and selects the first enabled phase', async () => {
      renderFlyout({
        initialPhases: {
          hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
          warm: { name: 'warm', size_in_bytes: 0, min_age: '30d' },
        },
      });

      await tick();

      expect(getTab('hot')).toBeInTheDocument();
      expect(getTab('warm')).toBeInTheDocument();
      expect(queryTab('cold')).not.toBeInTheDocument();

      expect(getPanel('hot')).toBeVisible();
      expect(getPanel('warm')).not.toBeVisible();

      fireEvent.click(getTab('warm'));
      expect(getPanel('warm')).toBeVisible();
      expect(getPanel('hot')).not.toBeVisible();
    });

    it('can add a new phase and selects it (no jump back to hot)', async () => {
      renderFlyout({
        initialPhases: {
          hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
        },
      });

      await tick();

      expect(queryTab('cold')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}AddTabButton`));

      await waitFor(() => expect(getTab('cold')).toBeInTheDocument());
      expect(getPanel('cold')).toBeVisible();
    });

    it('enables and selects a missing phase when selected externally', async () => {
      const { setSelectedPhase } = renderFlyout({
        initialPhases: {
          hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
        },
      });

      await tick();
      expect(queryTab('warm')).not.toBeInTheDocument();

      setSelectedPhase('warm');

      await waitFor(() => expect(getTab('warm')).toBeInTheDocument());
      expect(getPanel('warm')).toBeVisible();
    });
  });

  describe('save and cancel', () => {
    it('calls onSave with the current serialized phases when valid', async () => {
      const { onSave, initialPhases } = renderFlyout({
        initialPhases: {
          hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
          warm: { name: 'warm', size_in_bytes: 0, min_age: '30d' },
        },
      });

      await tick();
      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}SaveButton`));

      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
      expect(onSave).toHaveBeenCalledWith(initialPhases);
    });

    it('allows saving unchanged phases when warm min_age uses ms', async () => {
      const initialPhases: IlmPolicyPhases = {
        hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
        warm: { name: 'warm', size_in_bytes: 0, min_age: '1500ms' },
      } as any;

      const { onSave } = renderFlyout({ initialPhases }, { initialSelectedPhase: 'warm' });
      await tick();

      const warmPanel = withinPhase('warm');
      const unitSelect = warmPanel.getByTestId(
        `${DATA_TEST_SUBJ}MoveAfterUnit`
      ) as HTMLSelectElement;
      expect(unitSelect.value).toBe('ms');

      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}SaveButton`));
      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
      expect(onSave).toHaveBeenCalledWith(initialPhases);
    });

    it('calls onClose when cancelling', async () => {
      const { onClose } = renderFlyout();
      await tick();

      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}CancelButton`));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('min_age', () => {
    it('updates min_age when the move-after value changes (scoped to selected panel)', async () => {
      const onChange = jest.fn();
      const initialPhases: IlmPolicyPhases = {
        hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
        warm: { name: 'warm', size_in_bytes: 0, min_age: '30d' },
      };

      renderFlyout({ initialPhases, onChange });
      await tick();

      fireEvent.click(getTab('warm'));
      const warmPanel = withinPhase('warm');

      fireEvent.change(warmPanel.getByTestId(`${DATA_TEST_SUBJ}MoveAfterValue`), {
        target: { value: '10' },
      });

      await waitFor(() =>
        expect(onChange).toHaveBeenLastCalledWith({
          hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
          warm: { name: 'warm', size_in_bytes: 0, min_age: '10d' },
        })
      );
    });
  });

  describe('downsampling', () => {
    it('toggles downsampling on warm and emits output with the default interval', async () => {
      const onChange = jest.fn();
      renderFlyout({
        initialPhases: {
          hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
          warm: { name: 'warm', size_in_bytes: 0, min_age: '30d' },
        },
        onChange,
      });

      await tick();
      fireEvent.click(getTab('warm'));

      const warmPanel = withinPhase('warm');
      const switchEl = warmPanel.getByTestId(`${DATA_TEST_SUBJ}DownsamplingSwitch`);
      fireEvent.click(switchEl);

      await waitFor(() =>
        expect(onChange).toHaveBeenLastCalledWith({
          hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
          warm: {
            name: 'warm',
            size_in_bytes: 0,
            min_age: '30d',
            downsample: { after: '30d', fixed_interval: '1d' },
          },
        })
      );

      expect(warmPanel.getByTestId(`${DATA_TEST_SUBJ}DownsamplingIntervalValue`)).toBeVisible();
    });
  });

  describe('searchable snapshots', () => {
    it('hides searchable snapshot section in cold when cannot create repository and no repositories exist', async () => {
      renderFlyout({
        canCreateRepository: false,
        searchableSnapshotRepositories: [],
        initialPhases: {
          hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
          cold: { name: 'cold', size_in_bytes: 0, min_age: '20d' },
        },
      });

      await tick();
      fireEvent.click(getTab('cold'));

      const coldPanel = withinPhase('cold');
      expect(
        coldPanel.queryByTestId(`${DATA_TEST_SUBJ}SearchableSnapshotSwitch`)
      ).not.toBeInTheDocument();
      expect(
        coldPanel.queryByTestId(`${DATA_TEST_SUBJ}SnapshotRepositorySelect`)
      ).not.toBeInTheDocument();
    });

    it('shows a toggle for cold, but not for frozen (frozen is always enabled)', async () => {
      renderFlyout({
        initialPhases: {
          hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
          cold: {
            name: 'cold',
            size_in_bytes: 0,
            min_age: '20d',
            searchable_snapshot: 'repo1',
          },
          frozen: {
            name: 'frozen',
            size_in_bytes: 0,
            min_age: '40d',
            searchable_snapshot: 'repo1',
          },
        },
        searchableSnapshotRepositories: ['repo1', 'repo2'],
      });

      await tick();

      fireEvent.click(getTab('cold'));
      const coldPanel = withinPhase('cold');
      expect(
        coldPanel.getByTestId(`${DATA_TEST_SUBJ}SearchableSnapshotSwitch`)
      ).toBeInTheDocument();

      fireEvent.click(getTab('frozen'));
      const frozenPanel = withinPhase('frozen');
      expect(
        frozenPanel.queryByTestId(`${DATA_TEST_SUBJ}SearchableSnapshotSwitch`)
      ).not.toBeInTheDocument();
      expect(frozenPanel.getByTestId(`${DATA_TEST_SUBJ}SnapshotRepositorySelect`)).toBeVisible();
    });

    it('updates snapshot repository for cold+frozen (shared field)', async () => {
      const onChange = jest.fn();
      const initialPhases: IlmPolicyPhases = {
        hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
        cold: {
          name: 'cold',
          size_in_bytes: 0,
          min_age: '20d',
          searchable_snapshot: 'repo1',
        },
        frozen: {
          name: 'frozen',
          size_in_bytes: 0,
          min_age: '40d',
          searchable_snapshot: 'repo1',
        },
      };

      renderFlyout({
        initialPhases,
        searchableSnapshotRepositories: ['repo1', 'repo2'],
        onChange,
      });

      await tick();
      fireEvent.click(getTab('frozen'));

      const frozenPanel = withinPhase('frozen');
      fireEvent.change(frozenPanel.getByTestId(`${DATA_TEST_SUBJ}SnapshotRepositorySelect`), {
        target: { value: 'repo2' },
      });

      await waitFor(() =>
        expect(onChange).toHaveBeenLastCalledWith({
          ...initialPhases,
          cold: {
            ...initialPhases.cold,
            searchable_snapshot: 'repo2',
          },
          frozen: {
            ...initialPhases.frozen,
            searchable_snapshot: 'repo2',
          },
        })
      );
    });

    it('auto-selects the only snapshot repository option when enabling cold snapshots', async () => {
      renderFlyout({
        initialPhases: {
          hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
          cold: {
            name: 'cold',
            size_in_bytes: 0,
            min_age: '20d',
          },
        },
        searchableSnapshotRepositories: ['repo1'],
      });

      await tick();
      fireEvent.click(getTab('cold'));

      const coldPanel = withinPhase('cold');
      fireEvent.click(coldPanel.getByTestId(`${DATA_TEST_SUBJ}SearchableSnapshotSwitch`));

      const select = coldPanel.getByTestId(
        `${DATA_TEST_SUBJ}SnapshotRepositorySelect`
      ) as HTMLSelectElement;

      await waitFor(() => expect(select.value).toBe('repo1'));
    });

    it('invokes refresh callback when refreshing snapshot repositories (scoped)', async () => {
      const onRefresh = jest.fn();
      renderFlyout({
        initialPhases: {
          hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
          cold: {
            name: 'cold',
            size_in_bytes: 0,
            min_age: '20d',
            searchable_snapshot: 'repo1',
          },
        },
        searchableSnapshotRepositories: ['repo1'],
        onRefreshSearchableSnapshotRepositories: onRefresh,
      });

      await tick();
      fireEvent.click(getTab('cold'));
      const coldPanel = withinPhase('cold');

      fireEvent.click(coldPanel.getByTestId(`${DATA_TEST_SUBJ}SnapshotRepositoryRefreshButton`));
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('phase removal', () => {
    it('removes a non-hot phase and emits updated output', async () => {
      const onChange = jest.fn();
      renderFlyout({
        initialPhases: {
          hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
          warm: { name: 'warm', size_in_bytes: 0, min_age: '30d' },
        },
        onChange,
      });

      await tick();
      fireEvent.click(getTab('warm'));

      const warmPanel = withinPhase('warm');
      fireEvent.click(warmPanel.getByTestId(`${DATA_TEST_SUBJ}RemoveItemButton`));

      await waitFor(() => expect(queryTab('warm')).not.toBeInTheDocument());
      await waitFor(() =>
        expect(onChange).toHaveBeenLastCalledWith({
          hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
        })
      );
      expect(getPanel('hot')).toBeVisible();
    });

    it('disables remove when there is no hot phase and only one non-delete phase', async () => {
      const onChange = jest.fn();
      renderFlyout({
        initialPhases: {
          warm: { name: 'warm', size_in_bytes: 0, min_age: '30d' },
        },
        onChange,
      });

      await tick();

      const removeButton = withinPhase('warm').getByTestId(`${DATA_TEST_SUBJ}RemoveItemButton`);
      expect(removeButton).toBeDisabled();

      fireEvent.click(removeButton);
      expect(getTab('warm')).toBeInTheDocument();
    });

    it('disables remove when delete is the only enabled phase', async () => {
      const onChange = jest.fn();
      renderFlyout({
        initialPhases: {
          delete: { name: 'delete', min_age: '60d' },
        },
        onChange,
      });

      await tick();

      const removeButton = withinPhase('delete').getByTestId(`${DATA_TEST_SUBJ}RemoveItemButton`);
      expect(removeButton).toBeDisabled();

      fireEvent.click(removeButton);
      expect(getTab('delete')).toBeInTheDocument();
    });
  });
});
