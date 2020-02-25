/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
// @ts-ignore: implicit any for JS file
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { npSetup, npStart } from 'ui/new_platform';
import React from 'react';
import { ScreenCapturePanelContent } from '../components/screen_capture_panel_content';
import { ShareContext } from '../../../../../../src/plugins/share/public';

const { core } = npSetup;

async function reportingProvider() {
  const getShareMenuItems = ({
    objectType,
    objectId,
    sharingData,
    isDirty,
    onClose,
    shareableUrl,
  }: ShareContext) => {
    if (!['dashboard', 'visualization'].includes(objectType)) {
      return [];
    }
    // Dashboard only mode does not currently support reporting
    // https://github.com/elastic/kibana/issues/18286
    if (
      objectType === 'dashboard' &&
      npStart.plugins.kibanaLegacy.dashboardConfig.getHideWriteControls()
    ) {
      return [];
    }

    const getReportingJobParams = () => {
      // Replace hashes with original RISON values.
      const relativeUrl = shareableUrl.replace(
        window.location.origin + core.http.basePath.get(),
        ''
      );

      const browserTimezone =
        core.uiSettings.get('dateFormat:tz') === 'Browser'
          ? moment.tz.guess()
          : core.uiSettings.get('dateFormat:tz');

      return {
        ...sharingData,
        objectType,
        browserTimezone,
        relativeUrls: [relativeUrl],
      };
    };

    const getPngJobParams = () => {
      // Replace hashes with original RISON values.
      const relativeUrl = shareableUrl.replace(
        window.location.origin + core.http.basePath.get(),
        ''
      );

      const browserTimezone =
        core.uiSettings.get('dateFormat:tz') === 'Browser'
          ? moment.tz.guess()
          : core.uiSettings.get('dateFormat:tz');

      return {
        ...sharingData,
        objectType,
        browserTimezone,
        relativeUrl,
      };
    };

    const shareActions = [];
    if (xpackInfo.get('features.reporting.printablePdf.showLinks', false)) {
      const panelTitle = i18n.translate('xpack.reporting.shareContextMenu.pdfReportsButtonLabel', {
        defaultMessage: 'PDF Reports',
      });

      shareActions.push({
        shareMenuItem: {
          name: panelTitle,
          icon: 'document',
          toolTipContent: xpackInfo.get('features.reporting.printablePdf.message'),
          disabled: !xpackInfo.get('features.reporting.printablePdf.enableLinks', false)
            ? true
            : false,
          ['data-test-subj']: 'pdfReportMenuItem',
          sortOrder: 10,
        },
        panel: {
          id: 'reportingPdfPanel',
          title: panelTitle,
          content: (
            <ScreenCapturePanelContent
              reportType="printablePdf"
              objectType={objectType}
              objectId={objectId}
              getJobParams={getReportingJobParams}
              isDirty={isDirty}
              onClose={onClose}
            />
          ),
        },
      });
    }

    if (xpackInfo.get('features.reporting.png.showLinks', false)) {
      const panelTitle = 'PNG Reports';

      shareActions.push({
        shareMenuItem: {
          name: panelTitle,
          icon: 'document',
          toolTipContent: xpackInfo.get('features.reporting.png.message'),
          disabled: !xpackInfo.get('features.reporting.png.enableLinks', false) ? true : false,
          ['data-test-subj']: 'pngReportMenuItem',
          sortOrder: 10,
        },
        panel: {
          id: 'reportingPngPanel',
          title: panelTitle,
          content: (
            <ScreenCapturePanelContent
              reportType="png"
              objectType={objectType}
              objectId={objectId}
              getJobParams={getPngJobParams}
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
    id: 'screenCaptureReports',
    getShareMenuItems,
  };
}

(async () => {
  npSetup.plugins.share.register(await reportingProvider());
})();
