/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { documentationService } from '../../../../../services';
import { UIM_APP_NAME } from '../../../../../../../common/constants/ui_metric';
import { httpService } from '../../../../../services/http';
import { notificationService } from '../../../../../services/notification';
import { UiMetricService } from '../../../../../services/ui_metric';
import { AppDependencies, IndexManagementAppContext } from '../../../../..';
import { IndexMappingWithContextProps } from './index_mapping_with_context_types';
import { DetailsPageMappings } from '../details_page_mappings';

export const IndexMappingWithContext: React.FC<IndexMappingWithContextProps> = ({
  core,
  dependencies,
  index,
  showAboutMappings,
  hasUpdateMappingsPrivilege,
}) => {
  // this normally happens when the index management app is rendered
  // but if components are embedded elsewhere that setup is skipped, so we have to do it here
  // would do it in plugin.ts but that blows up the bundle size
  // can't do it in an effect because then the first http call fails as the instantiation happens after first render
  if (!httpService.httpClient) {
    httpService.setup(core.http);
    notificationService.setup(core.notifications);
  }
  documentationService.setup(core.docLinks);

  const newDependencies: AppDependencies = {
    ...dependencies,
    services: {
      ...(dependencies.services || {}),
      httpService,
      notificationService,
      uiMetricService: new UiMetricService(UIM_APP_NAME),
    },
  };
  return (
    <IndexManagementAppContext core={core} dependencies={newDependencies}>
      <DetailsPageMappings
        index={index}
        showAboutMappings={showAboutMappings}
        hasUpdateMappingsPrivilege={hasUpdateMappingsPrivilege}
      />
    </IndexManagementAppContext>
  );
};
