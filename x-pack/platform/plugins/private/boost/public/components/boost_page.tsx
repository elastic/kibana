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
import { formatDataSourceCounts } from './format';
import { LoadError } from './load_error';
import { ModeSwitchModal } from './mode_switch/mode_switch_modal';
import {
  isModeSwitchConfirmationSkipped,
  skipModeSwitchConfirmation,
} from './mode_switch/mode_switch_preferences';
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

/** Says how many indices and data streams a mode switch changed. */
const getChangedTargetsMessage = (changes: readonly ModeSwitchChange[]): string => {
  const indexCount = changes.filter(({ type }) => type === 'indices').length;
  return i18n.translate('xpack.boost.page.modeSwitchedText', {
    defaultMessage: '{targets} changed boost profile.',
    values: { targets: formatDataSourceCounts(indexCount, changes.length - indexCount) },
  });
};

const BOOST_PAGE_DESCRIPTION = i18n.translate('xpack.boost.page.description', {
  defaultMessage:
    'Balance search performance and cost for the indices and data streams in this project.',
});

export const BoostPage = () => {
  const {
    application: { capabilities },
    chrome,
    appParams,
    notifications,
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

  const switchMode = (
    mode: BoostMode,
    options?: { onSuccess?: () => void; onSettled?: () => void }
  ) =>
    updateMode(mode, {
      onSuccess: () => {
        history.push(mode === 'advanced' ? '/rules' : '/');
        options?.onSuccess?.();
      },
      onSettled: options?.onSettled,
    });

  // A switch that changes any index or data stream's profile is confirmed first, unless the user
  // chose to skip that, in which case a toast says what changed. The changes are worked out from
  // the state given, which is the newly saved one after saving simple-mode changes.
  const requestModeSwitch = (mode: BoostMode, currentState: BoostState) => {
    const changes = getModeSwitchChanges(currentState, mode);
    if (changes.length === 0) {
      switchMode(mode);
      return;
    }
    if (!isModeSwitchConfirmationSkipped(mode)) {
      setPendingModeSwitch({ mode, changes });
      return;
    }
    switchMode(mode, {
      onSuccess: () =>
        notifications.toasts.addSuccess({
          title:
            mode === 'simple'
              ? i18n.translate('xpack.boost.page.turnedOffAdvancedModeToast', {
                  defaultMessage: 'Turned off advanced mode',
                })
              : i18n.translate('xpack.boost.page.turnedOnAdvancedModeToast', {
                  defaultMessage: 'Turned on advanced mode',
                }),
          text: getChangedTargetsMessage(changes),
        }),
    });
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

      {isConfirmingUnsavedChanges && simpleDraft.draft && (
        <UnsavedChangesModal
          savedDefaults={state.settings.simple}
          draft={simpleDraft.draft}
          isSaving={simpleDraft.isSaving}
          onCancel={() => setIsConfirmingUnsavedChanges(false)}
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
          onConfirm={(shouldSkipNextTime) => {
            const { mode } = pendingModeSwitch;
            switchMode(mode, {
              // Only a switch that happens remembers the choice, so cancelling doesn't count.
              onSuccess: () => {
                if (shouldSkipNextTime) {
                  skipModeSwitchConfirmation(mode);
                }
              },
              onSettled: () => setPendingModeSwitch(undefined),
            });
          }}
        />
      )}
    </>
  );
};
