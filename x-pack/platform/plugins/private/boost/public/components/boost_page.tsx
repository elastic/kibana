/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { EuiButton, EuiEmptyPrompt, EuiPageSection, EuiSpacer } from '@elastic/eui';
import { AppHeader, AppHeaderLoading, type AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../../common/constants';
import { useBoostServices } from '../hooks/use_boost_services';
import { useBoostState, useUpdateMode } from '../hooks/use_boost_state';
import { BOOST_DOCS_URL } from '../doc_links';
import { BOOST_APP_TITLE } from '../translations';
import { ProfilesTab } from './profiles/profiles_tab';
import { RulesTab } from './rules/rules_tab';
import { SimpleModeSettings } from './simple_mode_settings';

type AdvancedTab = 'profiles' | 'rules';

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

  useEffect(() => {
    appParams.setBreadcrumbs([{ text: BOOST_APP_TITLE }]);
    chrome.docTitle.change(BOOST_APP_TITLE);
  }, [appParams, chrome]);

  if (error) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={
          <h2>
            {i18n.translate('xpack.boost.page.loadErrorTitle', {
              defaultMessage: 'Unable to load boost settings',
            })}
          </h2>
        }
        body={<p>{error.message}</p>}
        actions={
          <EuiButton onClick={() => refetch()}>
            {i18n.translate('xpack.boost.page.retryButton', { defaultMessage: 'Try again' })}
          </EuiButton>
        }
      />
    );
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

  const onModeChange = (checked: boolean) =>
    updateMode(checked ? 'advanced' : 'simple', {
      onSuccess: () => history.push(checked ? '/rules' : '/'),
    });

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
            savedDefaults={state.settings.simple}
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
    </>
  );
};
