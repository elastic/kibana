/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlyout } from '@elastic/eui';
import { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { attemptToURIDecode } from '@kbn/es-ui-shared-plugin/public';
import { IndexTemplateFlyoutWithContextProps } from './index_template_flyout_with_context_types';
import { httpService } from '../../../../services/http';
import { notificationService } from '../../../../services/notification';
import { UiMetricService } from '../../../../services/ui_metric';
import { documentationService } from '../../../../services';
import { UIM_APP_NAME } from '../../../../../../common/constants/ui_metric';
import { setUiMetricService } from '../../../../services/api';
import { AppDependencies, IndexManagementAppContext } from '../../../..';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '../../../../../locator';
import { TemplateDetailsContent } from './template_details_content';

export const IndexTemplateFlyoutWithContext: React.FC<IndexTemplateFlyoutWithContextProps> = ({
  core,
  dependencies,
  indexTemplateName,
  reload,
  onClose,
  usageCollection,
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

  const uiMetricService = new UiMetricService(UIM_APP_NAME);
  setUiMetricService(uiMetricService);
  uiMetricService.setup(usageCollection);

  const newDependencies: AppDependencies = {
    ...dependencies,
    services: {
      ...(dependencies.services || {}),
      httpService,
      notificationService,
      uiMetricService,
    },
  };
  const locator = dependencies.url.locators.get<IndexManagementLocatorParams>(
    INDEX_MANAGEMENT_LOCATOR_ID
  );

  const editTemplate = useCallback(
    (name: string) => {
      locator?.navigate({ page: 'index_template_edit', indexTemplate: name });
    },
    [locator]
  );

  const cloneTemplate = useCallback(
    (name: string) => {
      locator?.navigate({ page: 'index_template_clone', indexTemplate: name });
    },
    [locator]
  );

  const indexTemplate = useMemo(
    () => ({
      name: attemptToURIDecode(indexTemplateName)!,
      isLegacy: false,
    }),
    [indexTemplateName]
  );
  return (
    <IndexManagementAppContext core={core} dependencies={newDependencies}>
      <EuiFlyout onClose={onClose}>
        <TemplateDetailsContent
          template={indexTemplate}
          onClose={onClose}
          editTemplate={editTemplate}
          cloneTemplate={cloneTemplate}
          reload={reload}
        />
      </EuiFlyout>
    </IndexManagementAppContext>
  );
};
