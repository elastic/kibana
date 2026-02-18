/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo } from 'react';
import type { EuiPageHeaderProps } from '@elastic/eui';
import { EuiButtonEmpty, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { RouteComponentProps } from 'react-router-dom';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';

import { useIndexErrors } from '../../../../hooks/use_index_errors';
import { resetIndexUrlParams } from './reset_index_url_params';
import { renderBadges } from '../../../../lib/render_badges';
import type { Index } from '../../../../../../common';
import type { IndexDetailsTab, IndexDetailsTabId } from '../../../../../../common/constants';
import { INDEX_OPEN, IndexDetailsSection } from '../../../../../../common/constants';
import { getIndexDetailsLink } from '../../../../services/routing';
import { useAppContext } from '../../../../app_context';
import { DiscoverLink } from '../../../../lib/discover_link';
import { ManageIndexButton } from './manage_index_button';
import { DetailsPageOverview } from './details_page_overview';
import { DetailsPageMappings } from './details_page_mappings';
import { DetailsPageSettings } from './details_page_settings';
import { DetailsPageStats } from './details_page_stats';
import { DetailsPageTab } from './details_page_tab';
import { IndexErrorCallout } from './index_error_callout';

const defaultTabs: IndexDetailsTab[] = [
  {
    id: IndexDetailsSection.Overview,
    name: i18n.translate('xpack.idxMgmt.indexDetails.overviewTitle', {
      defaultMessage: 'Overview',
    }),
    renderTabContent: ({ index }) => <DetailsPageOverview indexDetails={index} />,
    order: 10,
  },
  {
    id: IndexDetailsSection.Mappings,
    name: i18n.translate('xpack.idxMgmt.indexDetails.mappingsTitle', {
      defaultMessage: 'Mappings',
    }),
    renderTabContent: ({ index }) => <DetailsPageMappings index={index} />,
    order: 20,
  },
  {
    id: IndexDetailsSection.Settings,
    name: i18n.translate('xpack.idxMgmt.indexDetails.settingsTitle', {
      defaultMessage: 'Settings',
    }),
    renderTabContent: ({ index }) => <DetailsPageSettings indexName={index.name} />,
    order: 30,
  },
];

const statsTab: IndexDetailsTab = {
  id: IndexDetailsSection.Stats,
  name: i18n.translate('xpack.idxMgmt.indexDetails.statsTitle', {
    defaultMessage: 'Statistics',
  }),
  renderTabContent: ({ index }) => (
    <DetailsPageStats indexName={index.name} isIndexOpen={index.status === INDEX_OPEN} />
  ),
  order: 40,
};

interface Props {
  index: Index;
  tab: IndexDetailsTabId;
  history: RouteComponentProps['history'];
  search: string;
  fetchIndexDetails: () => Promise<void>;
  navigateToIndicesList: () => void;
}
export const DetailsPageContentV2: FunctionComponent<Props> = ({
  index,
  tab,
  history,
  search,
  fetchIndexDetails,
  navigateToIndicesList,
}) => {
  const {
    core: {
      application: { capabilities },
    },
    config: { enableIndexStats },
    plugins: { console: consolePlugin, ml },
    services: { extensionsService, notificationService },
  } = useAppContext();
  const hasMLPermissions = capabilities?.ml?.canGetTrainedModels ? true : false;

  const indexErrors = useIndexErrors(index, ml, hasMLPermissions);

  const tabs = useMemo(() => {
    const sortedTabs = [...defaultTabs];
    if (enableIndexStats) {
      sortedTabs.push(statsTab);
    }
    extensionsService.indexDetailsTabs.forEach((dynamicTab) => {
      if (!dynamicTab.shouldRenderTab || dynamicTab.shouldRenderTab({ index })) {
        sortedTabs.push(dynamicTab);
      }
    });

    sortedTabs.sort((tabA, tabB) => {
      return tabA.order - tabB.order;
    });
    return sortedTabs;
  }, [enableIndexStats, extensionsService.indexDetailsTabs, index]);

  const onSectionChange = useCallback(
    (newSection: IndexDetailsTabId) => {
      return history.push(getIndexDetailsLink(index.name, resetIndexUrlParams(search), newSection));
    },
    [history, index.name, search]
  );

  const headerTabs = useMemo<EuiPageHeaderProps['tabs']>(() => {
    return tabs.map((tabConfig) => ({
      onClick: () => onSectionChange(tabConfig.id),
      isSelected: tabConfig.id === tab,
      key: tabConfig.id,
      'data-test-subj': `indexDetailsTab-${tabConfig.id}`,
      label: tabConfig.name,
    }));
  }, [tabs, tab, onSectionChange]);

  const pageTitle = (
    <>
      {index.name}
      {renderBadges(index, extensionsService)}
    </>
  );

  return (
    <>
      <EuiPageHeader
        data-test-subj="indexDetailsHeader"
        pageTitle={pageTitle}
        bottomBorder
        tabs={headerTabs}
        rightSideItems={[
          <ManageIndexButton
            index={index}
            reloadIndexDetails={fetchIndexDetails}
            navigateToIndicesList={navigateToIndicesList}
            fill={true}
          />,
          <DiscoverLink indexName={index.name} asButton={true} fill={false} />,
          <EuiButtonEmpty
            onClick={() =>
              openWiredConnectionDetails({
                props: { options: { defaultTabId: 'apiKeys' } },
              }).catch((error) => {
                notificationService.showDangerToast(error.body.message);
              })
            }
            iconType="plugs"
            data-test-subj="openConnectionDetails"
          >
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.connectionDetailsButtonLabel"
              defaultMessage="Connection details"
            />
          </EuiButtonEmpty>,
        ]}
      >
        {indexErrors.length > 0 ? <IndexErrorCallout errors={indexErrors} /> : null}
      </EuiPageHeader>
      <EuiSpacer size="l" />
      <div
        data-test-subj={`indexDetailsContent`}
        css={css`
          height: 100%;
        `}
      >
        <DetailsPageTab tabs={tabs} tab={tab} index={index} />
      </div>
      {consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null}
    </>
  );
};
