/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPublicSetup } from '@kbn/cases-plugin/public';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { PLUGIN_ICON } from '../../common/constants/app';
import { CASE_ATTACHMENT_TYPE_ID_SINGLE_METRIC_VIEWER } from '../../common/constants/cases';
import type { MlStartDependencies } from '../plugin';
import { getSingleMetricViewerComponent } from '../shared_components/single_metric_viewer';
import type { MlDependencies } from '../application/app';
import { getMlServices } from '../embeddables/single_metric_viewer/get_services';

export function registerSingleMetricViewerCasesAttachment(
  cases: CasesPublicSetup,
  coreStart: CoreStart,
  pluginStart: MlStartDependencies
) {
  cases.attachmentFramework.registerPersistableState({
    id: CASE_ATTACHMENT_TYPE_ID_SINGLE_METRIC_VIEWER,
    icon: PLUGIN_ICON,
    displayName: i18n.translate('xpack.ml.cases.registerSingleMetricViewer.displayName', {
      defaultMessage: 'Single metric viewer',
    }),
    getAttachmentViewObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.ml.cases.singleMetricViewer.embeddableAddedEvent"
          defaultMessage="added single metric viewer"
        />
      ),
      timelineAvatar: PLUGIN_ICON,
      children: React.lazy(async () => {
        const [{ initComponent }, mlServices] = await Promise.all([
          import('./single_metric_viewer_attachment'),
          getMlServices(coreStart, pluginStart),
        ]);
        const SingleMetricViewerComponent = getSingleMetricViewerComponent(
          coreStart,
          pluginStart as MlDependencies,
          mlServices
        );
        return {
          default: initComponent(pluginStart.fieldFormats, SingleMetricViewerComponent),
        };
      }),
    }),
  });
}
