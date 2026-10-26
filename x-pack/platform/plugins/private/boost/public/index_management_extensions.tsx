/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { Index, IndexManagementPluginStart } from '@kbn/index-management-shared-types';
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

/**
 * Shows the boost rule and profile that apply to each index and data stream in Index Management: on
 * an index's overview, and in its own tab, and in a data stream's details.
 */
export const registerIndexManagementExtensions = (
  core: CoreStart,
  deps: BoostStartDependencies & { indexManagement: IndexManagementPluginStart }
) => {
  const services = { ...core, ...deps };
  const renderPart = (part: IndexManagementPart, name: string, dataStream?: string) => (
    <Suspense fallback={null}>
      <LazyIndexManagementPart
        services={services}
        part={part}
        name={name}
        dataStream={dataStream}
      />
    </Suspense>
  );
  const { extensionsService } = deps.indexManagement;

  extensionsService.addIndexOverviewCard({
    id: 'boost',
    title: BOOST_APP_TITLE,
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
      renderPart('tab', name, dataStream),
  });

  extensionsService.addDataStreamDetail({
    id: 'boostProfile',
    name: i18n.translate('xpack.boost.dataStreamDetails.profile', {
      defaultMessage: 'Boost profile',
    }),
    toolTip: i18n.translate('xpack.boost.dataStreamDetails.profileTip', {
      defaultMessage: "Sets how the data stream's data is kept ready for search as it ages.",
    }),
    renderContent: ({ dataStreamName }) => renderPart('dataStreamProfile', dataStreamName),
  });

  extensionsService.addDataStreamDetail({
    id: 'boostRule',
    name: i18n.translate('xpack.boost.dataStreamDetails.rule', {
      defaultMessage: 'Boost rule',
    }),
    toolTip: i18n.translate('xpack.boost.dataStreamDetails.ruleTip', {
      defaultMessage:
        'The highest-ranked boost rule that matches the data stream, which applies its boost profile.',
    }),
    renderContent: ({ dataStreamName }) => renderPart('dataStreamRule', dataStreamName),
  });
};
