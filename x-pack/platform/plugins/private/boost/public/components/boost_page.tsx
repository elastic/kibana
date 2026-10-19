/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { EuiPageSection, EuiSpacer } from '@elastic/eui';
import { AppHeader, AppHeaderLoading, type AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../../common/constants';
import type { ModeSwitchChange } from '../../common/mode_switch';
import { getModeSwitchChanges } from '../../common/mode_switch';
import type { BoostMode, BoostState } from '../../common/types';
import { useBoostServices } from '../hooks/use_boost_services';
import { useBoostState, useUpdateMode } from '../hooks/use_boost_state';
import { BOOST_DOCS_URL } from '../doc_links';
import { BOOST_APP_TITLE } from '../translations';
import { LoadError } from './load_error';
import { ModeSwitchModal } from './mode_switch/mode_switch_modal';
import { ProfilesTab } from './profiles/profiles_tab';
import { RulesTab } from './rules/rules_tab';
import { SimpleModeSettings } from './simple_mode_settings';
import { useSimpleModeDraft } from './simple_mode_draft';
import { UnsavedChangesModal } from './mode_switch/unsaved_changes_modal';

type AdvancedTab = 'profiles' | 'rules';

/** A mode switch waiting for confirmation, with what it changes when it was asked for. */
interface PendingModeSwitch {
  mode: BoostMode;
  changes: ModeSwitchChange[];
}

const BOOST_PAGE_DESCRIPTION = i18n.translate('xpack.boost.page.description', {
  defaultMessage:
    'Balance search performance and cost for the indices and data streams in this project.',
});

export const BoostPage = () => {
  const {
    application: { capabilities },
    chrome,
    appParams,
  } = useBoostServices();
  const canEdit = capabilities[PLUGIN_ID]?.save === true;
  const history = useHistory();
  const { tab } = useParams<{ tab?: string }>();

  const { data: state, error, refetch } = useBoostState();
  const { mutate: updateMode, isLoading: isUpdatingMode } = useUpdateMode();
  const [pendingModeSwitch, setPendingModeSwitch] = useState<PendingModeSwitch>();
  const simpleDraft = useSimpleModeDraft(state?.settings.simple);
  const [isConfirmingUnsavedChanges, setIsConfirmingUnsavedChanges] = useState(false);

  useEffect(() => {
    appParams.setBreadcrumbs([{ text: BOOST_APP_TITLE }]);
    chrome.docTitle.change(BOOST_APP_TITLE);
  }, [appParams, chrome]);

  if (error) {
    return <LoadError error={error} onRetry={() => refetch()} />;
  }

  if (!state) {
    return <AppHeaderLoading />;
  }

  const isAdvanced = state.settings.mode === 'advanced';
  // Rules come first: they decide where each profile applies.
  const selectedTab: AdvancedTab = tab === 'profiles' ? 'profiles' : 'rules';

  const tabs: AppHeaderTab[] | undefined = isAdvanced
    ? [
        {
          id: 'rules',
          label: i18n.translate('xpack.boost.page.rulesTab', { defaultMessage: 'Boost rules' }),
          isSelected: selectedTab === 'rules',
          onClick: () => history.push('/rules'),
          'data-test-subj': 'boostRulesTab',
        },
        {
          id: 'profiles',
          label: i18n.translate('xpack.boost.page.profilesTab', {
            defaultMessage: 'Boost profiles',
          }),
          isSelected: selectedTab === 'profiles',
          onClick: () => history.push('/profiles'),
          'data-test-subj': 'boostProfilesTab',
        },
      ]
    : undefined;

  const switchMode = (mode: BoostMode, onSettled?: () => void) =>
    updateMode(mode, {
      onSuccess: () => history.push(mode === 'advanced' ? '/rules' : '/'),
      onSettled,
    });

  // A switch that changes any index or data stream's profile is always confirmed first. The
  // changes are worked out from the state given, which is the newly saved one after saving
  // simple-mode changes.
  const requestModeSwitch = (mode: BoostMode, currentState: BoostState) => {
    const changes = getModeSwitchChanges(currentState, mode);
    if (changes.length === 0) {
      switchMode(mode);
      return;
    }
    setPendingModeSwitch({ mode, changes });
  };

  // Turning on advanced mode would lose unsaved simple-mode changes, so it asks about them first.
  const onModeChange = (checked: boolean) => {
    if (checked && simpleDraft.isDirty) {
      setIsConfirmingUnsavedChanges(true);
      return;
    }
    requestModeSwitch(checked ? 'advanced' : 'simple', state);
  };

  return (
    <>
      <AppHeader
        title={BOOST_APP_TITLE}
        description={{ text: BOOST_PAGE_DESCRIPTION, learnMoreUrl: BOOST_DOCS_URL }}
        tabs={tabs}
        spacing="bleed"
        menu={{
          switch: {
            id: 'boostAdvancedMode',
            label: i18n.translate('xpack.boost.page.advancedModeSwitch', {
              defaultMessage: 'Advanced mode',
            }),
            checked: isAdvanced,
            onChange: onModeChange,
            disabled: !canEdit || isUpdatingMode,
            tooltipContent: i18n.translate('xpack.boost.page.advancedModeTooltip', {
              defaultMessage:
                'Tune individual indices and data streams with boost profiles and rules. Turning advanced mode off suspends custom profiles and rules until you turn it back on.',
            }),
            'data-test-subj': 'boostAdvancedModeSwitch',
          },
        }}
      />
      <EuiSpacer size="l" />

      <EuiPageSection paddingSize="none" color="transparent" restrictWidth>
        {!isAdvanced && (
          <SimpleModeSettings
            simpleDraft={simpleDraft}
            canEdit={canEdit}
            onEnableAdvancedMode={() => onModeChange(true)}
            isUpdatingMode={isUpdatingMode}
          />
        )}
        {isAdvanced && selectedTab === 'profiles' && (
          <ProfilesTab
            profiles={state.profiles}
            rules={state.rules}
            dataSources={state.data_sources}
            canEdit={canEdit}
          />
        )}
        {isAdvanced && selectedTab === 'rules' && (
          <RulesTab
            rules={state.rules}
            profiles={state.profiles}
            dataSources={state.data_sources}
            canEdit={canEdit}
          />
        )}
      </EuiPageSection>

      {isConfirmingUnsavedChanges && (
        <UnsavedChangesModal
          changeCount={simpleDraft.changeCount}
          isSaving={simpleDraft.isSaving}
          onClose={() => setIsConfirmingUnsavedChanges(false)}
          onDiscard={() => {
            simpleDraft.discard();
            setIsConfirmingUnsavedChanges(false);
            requestModeSwitch('advanced', state);
          }}
          onSave={() =>
            simpleDraft.save((savedState) => {
              setIsConfirmingUnsavedChanges(false);
              requestModeSwitch('advanced', savedState);
            })
          }
        />
      )}

      {pendingModeSwitch && (
        <ModeSwitchModal
          mode={pendingModeSwitch.mode}
          changes={pendingModeSwitch.changes}
          isSwitching={isUpdatingMode}
          onCancel={() => setPendingModeSwitch(undefined)}
          onConfirm={() =>
            switchMode(pendingModeSwitch.mode, () => setPendingModeSwitch(undefined))
          }
        />
      )}
    </>
  );
};
