/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
// @ts-ignore: implicit any for JS file
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import React from 'react';
import { ShareActionProps } from 'ui/share/share_action';
import { ShareContextMenuExtensionsRegistryProvider } from 'ui/share/share_action_registry';
import { ReportingPanelContent } from '../components/reporting_panel_content';

function reportingProvider() {
  const getShareActions = ({
    objectType,
    objectId,
    sharingData,
    isDirty,
    onClose,
  }: ShareActionProps) => {
    if ('search' !== objectType) {
      return [];
    }

    const getJobParams = () => {
      return {
        ...sharingData,
        type: objectType,
      };
    };

    const shareActions = [];
    if (xpackInfo.get('features.reporting.csv.showLinks', false)) {
      const panelTitle = i18n.translate('xpack.reporting.shareContextMenu.csvReportsButtonLabel', {
        defaultMessage: 'CSV Reports',
      });

      shareActions.push({
        shareMenuItem: {
          name: panelTitle,
          icon: 'document',
          toolTipContent: xpackInfo.get('features.reporting.csv.message'),
          disabled: !xpackInfo.get('features.reporting.csv.enableLinks', false) ? true : false,
          ['data-test-subj']: 'csvReportMenuItem',
        },
        panel: {
          title: panelTitle,
          content: (
            <ReportingPanelContent
              reportType="csv"
              layoutId={undefined}
              objectType={objectType}
              objectId={objectId}
              getJobParams={getJobParams}
              isDirty={isDirty}
              onClose={onClose}
            />
          ),
        },
      });
    }

    return shareActions;
  };

  return {
    id: 'csvReports',
    getShareActions,
  };
}

ShareContextMenuExtensionsRegistryProvider.register(reportingProvider);
