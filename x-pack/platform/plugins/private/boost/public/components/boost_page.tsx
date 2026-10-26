/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { EuiPageSection, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { AppHeader, AppHeaderLoading } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { PLUGIN_ID } from '../../common/constants';
import { useBoostServices } from '../hooks/use_boost_services';
import { useBoostState } from '../hooks/use_boost_state';
import { BOOST_DOCS_URL } from '../doc_links';
import { BOOST_APP_TITLE } from '../translations';
import { LoadError } from './load_error';
import { ProfilesTab } from './profiles/profiles_tab';
import { ProjectDefaults } from './project_defaults/project_defaults';
import { RulesTab } from './rules/rules_tab';

type BoostTab = 'profiles' | 'rules';

const BOOST_PAGE_DESCRIPTION = i18n.translate('xpack.boost.page.description', {
  defaultMessage:
    'Balance search performance and cost for the indices and data streams in this project.',
});

/**
 * The project's defaults, which apply to whatever no boost rule matches, above the boost rules and
 * profiles that tune specific indices and data streams.
 */
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

  useEffect(() => {
    appParams?.setBreadcrumbs([{ text: BOOST_APP_TITLE }]);
    chrome.docTitle.change(BOOST_APP_TITLE);
  }, [appParams, chrome]);

  if (error) {
    return <LoadError error={error} onRetry={() => refetch()} />;
  }

  if (!state) {
    return <AppHeaderLoading />;
  }

  // Rules come first: they decide where each profile applies.
  const selectedTab: BoostTab = tab === 'profiles' ? 'profiles' : 'rules';
  const tabs: ReadonlyArray<{ id: BoostTab; label: string }> = [
    {
      id: 'rules',
      label: i18n.translate('xpack.boost.page.rulesTab', { defaultMessage: 'Boost rules' }),
    },
    {
      id: 'profiles',
      label: i18n.translate('xpack.boost.page.profilesTab', { defaultMessage: 'Boost profiles' }),
    },
  ];

  return (
    <>
      <AppHeader
        title={BOOST_APP_TITLE}
        description={{ text: BOOST_PAGE_DESCRIPTION, learnMoreUrl: BOOST_DOCS_URL }}
        spacing="bleed"
      />
      <EuiSpacer size="l" />

      <EuiPageSection paddingSize="none" color="transparent" restrictWidth>
        <ProjectDefaults state={state} canEdit={canEdit} />
        <EuiSpacer size="xl" />

        <EuiTabs size="l">
          {tabs.map(({ id, label }) => (
            <EuiTab
              key={id}
              isSelected={selectedTab === id}
              {...reactRouterNavigate(history, `/${id}`)}
              data-test-subj={id === 'rules' ? 'boostRulesTab' : 'boostProfilesTab'}
            >
              {label}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="l" />

        {selectedTab === 'profiles' ? (
          <ProfilesTab
            profiles={state.profiles}
            rules={state.rules}
            dataSources={state.data_sources}
            canEdit={canEdit}
          />
        ) : (
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
