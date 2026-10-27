/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type {
  DataStreamAttributes,
  Index,
  IndexManagementPluginStart,
} from '@kbn/index-management-shared-types';
import { PLUGIN_ID } from '../common/constants';
import { BOOST_INDEX_DETAILS_TAB_ID } from './components/index_management/constants';
import type { IndexManagementPart } from './components/index_management/index_management_part';
import { BOOST_APP_TITLE } from './translations';
import type { BoostStartDependencies } from './types';

// Loaded only once Index Management shows an index or data stream, to keep the page load small.
const LazyIndexManagementPart = lazy(() =>
  import('./components/index_management/index_management_part').then(
    ({ IndexManagementPartView }) => ({ default: IndexManagementPartView })
  )
);

// Elasticsearch doesn't boost system indices, which the boost server marks for Index Management.
const isBoostable = ({ index }: { index: Index }) => index.isBoostable !== false;

// Nor system data streams, which Elasticsearch marks itself.
const isBoostableDataStream = ({ dataStream }: { dataStream: DataStreamAttributes }) =>
  dataStream.system !== true;

// The card and the data stream detail lead with the rule, which the profile is a detail of, as
// Index Management names its details by what they show. The tab shows more, so it takes the app's
// name.
const BOOST_RULE_TITLE = i18n.translate('xpack.boost.indexManagement.ruleTitle', {
  defaultMessage: 'Boost rule',
});

/**
 * Shows the boost rule and profile that apply to each index and data stream in Index Management: on
 * an index's overview, and in its own tab, and in a data stream's details, whose menu edits the rule
 * for those who can.
 */
export const registerIndexManagementExtensions = (
  core: CoreStart,
  deps: BoostStartDependencies & { indexManagement: IndexManagementPluginStart }
) => {
  const services = { ...core, ...deps };
  const renderPart = (
    part: IndexManagementPart,
    name: string,
    { dataStream, onClose }: { dataStream?: string; onClose?: () => void } = {}
  ) => (
    <Suspense fallback={null}>
      <LazyIndexManagementPart
        services={services}
        part={part}
        name={name}
        dataStream={dataStream}
        onClose={onClose}
      />
    </Suspense>
  );
  const { extensionsService } = deps.indexManagement;

  extensionsService.addIndexOverviewCard({
    id: 'boost',
    title: BOOST_RULE_TITLE,
    shouldRenderCard: isBoostable,
    renderCard: ({ index: { name } }) => ({
      content: { left: renderPart('cardRule', name), right: renderPart('cardActions', name) },
      footer: { left: renderPart('cardProfile', name) },
    }),
  });

  // After the overview, as it's the overview card's details. Its dividers meet the tabs', as on the
  // boost app's details pages.
  extensionsService.addIndexDetailsTab({
    id: BOOST_INDEX_DETAILS_TAB_ID,
    name: BOOST_APP_TITLE,
    order: 15,
    hasTopSpacing: false,
    shouldRenderTab: isBoostable,
    renderTabContent: ({ index: { name, data_stream: dataStream } }) =>
      renderPart('tab', name, { dataStream }),
  });

  // One detail, like the index overview card: the rule that applies, and the profile it uses.
  extensionsService.addDataStreamDetail({
    id: 'boost',
    name: BOOST_RULE_TITLE,
    toolTip: i18n.translate('xpack.boost.dataStreamDetails.tip', {
      defaultMessage:
        "The highest-ranked boost rule that matches the data stream, and the boost profile it uses, which sets how the data stream's data is kept ready for search as it ages.",
    }),
    shouldRender: isBoostableDataStream,
    renderContent: ({ dataStreamName }) => renderPart('dataStream', dataStreamName),
  });

  // Every rule can change, unlike Elastic-managed profiles, so the menu edits the rule, as the
  // index overview card does.
  if (core.application.capabilities[PLUGIN_ID]?.save === true) {
    extensionsService.addDataStreamAction({
      id: 'boostEditRule',
      name: i18n.translate('xpack.boost.dataStreamDetails.editRule', {
        defaultMessage: 'Edit boost rule',
      }),
      icon: 'chartGauge',
      shouldRender: isBoostableDataStream,
      renderContent: ({ dataStreamName, onClose }) =>
        renderPart('dataStreamEditRule', dataStreamName, { onClose }),
    });
  }
};
