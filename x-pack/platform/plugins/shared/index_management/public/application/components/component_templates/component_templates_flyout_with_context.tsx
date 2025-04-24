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

import React, { useCallback } from 'react';
import { EuiFlyout } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { ComponentTemplatesFlyoutWithContextProps } from './component_templates_flyout_with_context_types';
import { httpService } from '../../services/http';
import { notificationService } from '../../services/notification';
import { UiMetricService } from '../../services/ui_metric';
import { documentationService } from '../../services';
import { UIM_APP_NAME } from '../../../../common/constants/ui_metric';
import { setUiMetricService } from '../../services/api';
import { AppDependencies, IndexManagementAppContext } from '../..';
import { ComponentTemplateDetailsFlyoutContent } from './component_template_details';
import { attemptToURIDecode } from './shared_imports';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '../../../locator';

export const ComponentTemplatesFlyoutWithContext: React.FC<
  ComponentTemplatesFlyoutWithContextProps
> = ({ core, dependencies, componentTemplateName, onClose, usageCollection }) => {
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

  const goToEditComponentTemplate = useCallback(
    (name: string) => {
      locator?.navigate({ page: 'edit_component_template', componentTemplate: name });
    },
    [locator]
  );

  const goToCloneComponentTemplate = useCallback(
    (name: string) => {
      locator?.navigate({ page: 'clone_component_template', componentTemplate: name });
    },
    [locator]
  );

  const actions = [
    {
      name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.editButtonLabel', {
        defaultMessage: 'Edit',
      }),
      icon: 'pencil',
      handleActionClick: () =>
        goToEditComponentTemplate(attemptToURIDecode(componentTemplateName)!),
    },
    {
      name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.cloneActionLabel', {
        defaultMessage: 'Clone',
      }),
      icon: 'copy',
      handleActionClick: () =>
        goToCloneComponentTemplate(attemptToURIDecode(componentTemplateName)!),
    },
  ];
  return (
    <IndexManagementAppContext core={core} dependencies={newDependencies}>
      <EuiFlyout onClose={onClose}>
        <ComponentTemplateDetailsFlyoutContent
          componentTemplateName={componentTemplateName}
          onClose={onClose}
          actions={actions}
          showSummaryCallToAction
        />
      </EuiFlyout>
    </IndexManagementAppContext>
  );
};
