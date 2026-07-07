/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { PhaseName } from '@kbn/streams-schema';

import { EditDlmPhasesFlyout } from './edit_dlm_phases_flyout';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  IlmPhaseSelect: ({ onSelect, renderButton, ...props }: any) => {
    const buttonProps = {
      disabled: false,
      onClick: () => onSelect('frozen'),
    };

    return (
      <div>
        {renderButton(buttonProps)}
        {props.showEnterpriseLicenseRequiredBadge && (
          <div data-test-subj="mockEnterpriseLicenseRequiredBadge" />
        )}
        {props.showDefaultRepositoryRequiredBadge && (
          <div data-test-subj="mockDefaultRepositoryRequiredBadge" />
        )}
      </div>
    );
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
const withinPhase = (phase: string) => within(getPanel(phase));

const renderDlmFlyout = (
  props: Partial<React.ComponentProps<typeof EditDlmPhasesFlyout>> = {},
  options: { initialSelectedPhase?: PhaseName } = {}
) => {
  const onClose = jest.fn();
  const onChange = jest.fn();
  const onSave = jest.fn();

  const initialDsl = props.initialDsl ?? {
    frozen_after: '30d',
    data_retention: '60d',
  };

  const Wrapper = () => {
    const [selectedPhase, setSelectedPhase] = React.useState<PhaseName | undefined>(
      options.initialSelectedPhase
    );

    return (
      <>
        <div data-test-subj="selectedPhaseValue">{selectedPhase ?? ''}</div>
        <EditDlmPhasesFlyout
          initialDsl={initialDsl}
          defaultRepositoryName="found-snapshots"
          manageRepositoriesHref="/app/management/data/snapshot_repositories"
          selectedPhase={selectedPhase}
          setSelectedPhase={setSelectedPhase}
          onClose={onClose}
          onChange={onChange}
          onSave={onSave}
          onChangeDebounceMs={0}
          {...props}
        />
      </>
    );
  };

  render(
    <I18nProvider>
      <Wrapper />
    </I18nProvider>
  );

  return { onClose, onChange, onSave };
};

describe('EditDlmPhasesFlyout', () => {
  it('renders the flyout title and action buttons', async () => {
    renderDlmFlyout({}, { initialSelectedPhase: 'frozen' });
    await tick();

    expect(screen.getByText('Edit data phases')).toBeInTheDocument();
    expect(screen.getByTestId(`${DATA_TEST_SUBJ}CancelButton`)).toBeVisible();
    expect(screen.getByTestId(`${DATA_TEST_SUBJ}SaveButton`)).toBeVisible();
  });

  it('calls onClose when cancelling', async () => {
    const { onClose } = renderDlmFlyout({}, { initialSelectedPhase: 'frozen' });
    await tick();

    fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}CancelButton`));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with current DSL when applying', async () => {
    const { onSave } = renderDlmFlyout({}, { initialSelectedPhase: 'delete' });
    await tick();

    fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}SaveButton`));
    await tick();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenLastCalledWith({
      frozen_after: '30d',
      data_retention: '60d',
    });
  });

  it('applies edited delete after value', async () => {
    const { onSave } = renderDlmFlyout({}, { initialSelectedPhase: 'delete' });
    await tick();

    const deletePanel = withinPhase('delete');
    const valueInput = deletePanel.getByTestId(`${DATA_TEST_SUBJ}MoveAfterValue`);
    fireEvent.change(valueInput, { target: { value: '90' } });
    fireEvent.blur(valueInput);
    await tick();

    fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}SaveButton`));
    await tick();

    expect(onSave).toHaveBeenCalled();
    expect(onSave).toHaveBeenLastCalledWith({
      frozen_after: '30d',
      data_retention: '90d',
    });
  });

  it('does not emit onChange while typing (commits on blur)', async () => {
    const { onChange } = renderDlmFlyout({}, { initialSelectedPhase: 'delete' });
    await tick();
    onChange.mockClear();

    const deletePanel = withinPhase('delete');
    const valueInput = deletePanel.getByTestId(`${DATA_TEST_SUBJ}MoveAfterValue`);
    fireEvent.change(valueInput, { target: { value: '90' } });
    await tick();

    expect(onChange).toHaveBeenCalledTimes(0);

    fireEvent.blur(valueInput);
    await tick();

    expect(onChange).toHaveBeenCalled();
  });

  it('redirects selectedPhase=hot to frozen when frozen exists', async () => {
    renderDlmFlyout({}, { initialSelectedPhase: 'hot' });
    await tick();

    expect(screen.getByTestId('selectedPhaseValue')).toHaveTextContent('frozen');
  });

  it('redirects selectedPhase=hot to delete when only delete exists', async () => {
    renderDlmFlyout({ initialDsl: { data_retention: '60d' } }, { initialSelectedPhase: 'hot' });
    await tick();

    expect(screen.getByTestId('selectedPhaseValue')).toHaveTextContent('delete');
  });

  it('redirects selectedPhase=hot to empty state when no additional phases exist', async () => {
    renderDlmFlyout({ initialDsl: {} }, { initialSelectedPhase: 'hot' });
    await tick();

    expect(screen.getByTestId('selectedPhaseValue')).toHaveTextContent('');
    expect(screen.getByTestId(`${DATA_TEST_SUBJ}DlmEmptyState`)).toBeVisible();
  });

  it('enables delete with defaults when selected externally and delete is not enabled', async () => {
    renderDlmFlyout({ initialDsl: {} }, { initialSelectedPhase: 'delete' });
    await tick();

    expect(getTab('delete')).toBeInTheDocument();
    expect(withinPhase('delete').getByTestId(`${DATA_TEST_SUBJ}MoveAfterValue`)).toHaveValue(30);
    expect(screen.getByTestId('selectedPhaseValue')).toHaveTextContent('delete');
  });

  it('defaults delete after to 2x frozen when enabling delete via external selection', async () => {
    renderDlmFlyout({ initialDsl: { frozen_after: '40d' } }, { initialSelectedPhase: 'delete' });
    await tick();

    expect(getTab('delete')).toBeInTheDocument();
    expect(withinPhase('delete').getByTestId(`${DATA_TEST_SUBJ}MoveAfterValue`)).toHaveValue(80);
  });

  it('shows a Frozen badge in add-phase menu and triggers upgrade when frozen is blocked by license', async () => {
    const onUpgradeEnterprise = jest.fn();
    renderDlmFlyout(
      { initialDsl: {}, isMissingEnterpriseLicense: true, onUpgradeEnterprise },
      { initialSelectedPhase: undefined }
    );
    await tick();

    fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}DlmEmptyStateAddButton`));

    expect(
      within(screen.getByTestId(`${DATA_TEST_SUBJ}DlmEmptyState`)).getByTestId(
        'mockEnterpriseLicenseRequiredBadge'
      )
    ).toBeInTheDocument();
    expect(onUpgradeEnterprise).toHaveBeenCalledTimes(1);

    expect(queryTab('frozen')).not.toBeInTheDocument();
  });

  it('shows a Frozen badge in add-phase menu and triggers create-repo flow when frozen is blocked by missing default repo', async () => {
    const onMissingDefaultRepository = jest.fn();
    renderDlmFlyout(
      {
        initialDsl: {},
        defaultRepositoryName: undefined,
        onMissingDefaultRepository,
      },
      { initialSelectedPhase: undefined }
    );
    await tick();

    fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}DlmEmptyStateAddButton`));

    expect(
      within(screen.getByTestId(`${DATA_TEST_SUBJ}DlmEmptyState`)).getByTestId(
        'mockDefaultRepositoryRequiredBadge'
      )
    ).toBeInTheDocument();
    expect(onMissingDefaultRepository).toHaveBeenCalledTimes(1);

    expect(queryTab('frozen')).not.toBeInTheDocument();
  });

  it('shows an empty state when no frozen or delete phase is configured', async () => {
    renderDlmFlyout({ initialDsl: {} }, {});
    await tick();

    expect(getTab('hot')).toBeInTheDocument();
    expect(queryTab('frozen')).not.toBeInTheDocument();
    expect(queryTab('delete')).not.toBeInTheDocument();

    expect(screen.getByTestId(`${DATA_TEST_SUBJ}DlmEmptyState`)).toBeVisible();
  });

  it('renders only hot/frozen/delete tabs; hot is disabled', async () => {
    renderDlmFlyout({}, { initialSelectedPhase: 'frozen' });
    await tick();

    expect(getTab('hot')).toBeInTheDocument();
    expect(getTab('frozen')).toBeInTheDocument();
    expect(getTab('delete')).toBeInTheDocument();

    expect(queryTab('warm')).not.toBeInTheDocument();
    expect(queryTab('cold')).not.toBeInTheDocument();

    expect(getTab('hot')).toBeDisabled();
    expect(getTab('hot')).not.toHaveClass('streamsIlmPhasesTab--hasWarnings');
    expect(getTab('frozen')).not.toHaveClass('streamsIlmPhasesTab--hasWarnings');

    await waitFor(() => {
      expect(screen.getByTestId(`${DATA_TEST_SUBJ}AddTabButton`)).toBeDisabled();
    });

    fireEvent.mouseOver(getTab('hot'));
    expect(
      await screen.findByText(
        /The hot phase is required and fully managed in data stream lifecycles\. No manual configuration is needed\./i
      )
    ).toBeInTheDocument();
  });

  it('shows only the move-after field + DLM searchable snapshot info for frozen', async () => {
    renderDlmFlyout({}, { initialSelectedPhase: 'frozen' });
    await tick();

    const frozenPanel = withinPhase('frozen');
    expect(frozenPanel.getByTestId(`${DATA_TEST_SUBJ}MoveAfterValue`)).toBeVisible();
    expect(frozenPanel.getByText('Must occur before the delete phase (60d).')).toBeInTheDocument();
    expect(frozenPanel.getByTestId(`${DATA_TEST_SUBJ}DlmSearchableSnapshotInfo`)).toBeVisible();
    expect(
      frozenPanel.queryByTestId(`${DATA_TEST_SUBJ}FrozenEnterpriseRequiredCallout`)
    ).not.toBeInTheDocument();
    expect(frozenPanel.getByTestId(`${DATA_TEST_SUBJ}RemoveFrozenPhaseButton`)).toBeVisible();
  });

  it('does not show frozen help text when the delete phase is not enabled', async () => {
    renderDlmFlyout({ initialDsl: { frozen_after: '30d' } }, { initialSelectedPhase: 'frozen' });
    await tick();

    const frozenPanel = withinPhase('frozen');
    expect(frozenPanel.queryByText(/Must occur before the .* phase/i)).not.toBeInTheDocument();
  });

  it('shows a default repository required callout in frozen searchable snapshot section when default repo is missing', async () => {
    renderDlmFlyout(
      {
        defaultRepositoryName: undefined,
        onMissingDefaultRepository: jest.fn(),
        onRefreshDefaultRepository: jest.fn(),
        isRefreshingDefaultRepository: true,
      },
      { initialSelectedPhase: 'frozen' }
    );
    await tick();

    expect(getTab('frozen')).toHaveClass('streamsIlmPhasesTab--hasWarnings');

    const frozenPanel = withinPhase('frozen');
    expect(frozenPanel.getByTestId(`${DATA_TEST_SUBJ}DlmSearchableSnapshotInfo`)).toBeVisible();
    expect(
      frozenPanel.getByTestId(`${DATA_TEST_SUBJ}FrozenDefaultRepositoryRequiredCallout`)
    ).toBeVisible();
    expect(frozenPanel.getByTestId(`${DATA_TEST_SUBJ}CreateDefaultRepositoryButton`)).toBeVisible();
    expect(
      frozenPanel.getByTestId(`${DATA_TEST_SUBJ}RefreshDefaultRepositoryButton`)
    ).toBeVisible();

    expect(frozenPanel.getByTestId(`${DATA_TEST_SUBJ}MoveAfterValue`)).toBeDisabled();
    expect(frozenPanel.getByTestId(`${DATA_TEST_SUBJ}MoveAfterUnit`)).toBeDisabled();
  });

  it('shows only the delete-after field for delete and a remove button', async () => {
    renderDlmFlyout({}, { initialSelectedPhase: 'delete' });
    await tick();

    const deletePanel = withinPhase('delete');
    expect(deletePanel.getByTestId(`${DATA_TEST_SUBJ}MoveAfterValue`)).toBeVisible();
    expect(deletePanel.getByText('Must occur after the frozen phase (30d).')).toBeInTheDocument();
    expect(deletePanel.getByTestId(`${DATA_TEST_SUBJ}RemoveDeletePhaseButton`)).toBeVisible();
  });

  it('does not show delete help text when previous phase is hot', async () => {
    renderDlmFlyout({ initialDsl: { data_retention: '60d' } }, { initialSelectedPhase: 'delete' });
    await tick();

    const deletePanel = withinPhase('delete');
    expect(deletePanel.queryByText(/Must occur after the .* phase/i)).not.toBeInTheDocument();
  });

  it('shows a frozen license callout and warning state when enterprise is missing', async () => {
    renderDlmFlyout(
      {
        isMissingEnterpriseLicense: true,
        onUpgradeEnterprise: jest.fn(),
      },
      { initialSelectedPhase: 'frozen' }
    );
    await tick();

    expect(getTab('frozen')).toHaveClass('streamsIlmPhasesTab--hasWarnings');

    const frozenPanel = withinPhase('frozen');
    expect(screen.getByTestId(`${DATA_TEST_SUBJ}FrozenEnterpriseRequiredCallout`)).toBeVisible();
    expect(screen.getByTestId(`${DATA_TEST_SUBJ}UpgradeEnterpriseButton`)).toBeVisible();
    expect(frozenPanel.getByTestId(`${DATA_TEST_SUBJ}MoveAfterValue`)).toBeDisabled();
    expect(frozenPanel.getByTestId(`${DATA_TEST_SUBJ}MoveAfterUnit`)).toBeDisabled();
  });

  it('emits DSL fields on change', async () => {
    const { onChange } = renderDlmFlyout({}, { initialSelectedPhase: 'delete' });
    await tick();

    const deletePanel = withinPhase('delete');
    const valueInput = deletePanel.getByTestId(`${DATA_TEST_SUBJ}MoveAfterValue`);
    fireEvent.change(valueInput, { target: { value: '90' } });
    fireEvent.blur(valueInput);
    await tick();

    expect(onChange).toHaveBeenCalled();
    const [next] = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(next).toEqual({
      data_retention: '90d',
      frozen_after: '30d',
    });
  });

  it('allows removing frozen and delete phases and shows empty state when both removed', async () => {
    renderDlmFlyout({}, { initialSelectedPhase: 'frozen' });
    await tick();

    fireEvent.click(withinPhase('frozen').getByTestId(`${DATA_TEST_SUBJ}RemoveFrozenPhaseButton`));
    await tick();

    expect(queryTab('frozen')).not.toBeInTheDocument();
    expect(getTab('delete')).toBeInTheDocument();

    fireEvent.click(withinPhase('delete').getByTestId(`${DATA_TEST_SUBJ}RemoveDeletePhaseButton`));
    await tick();

    expect(queryTab('delete')).not.toBeInTheDocument();
    expect(screen.getByTestId(`${DATA_TEST_SUBJ}DlmEmptyState`)).toBeVisible();
  });
});
