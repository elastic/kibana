/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCard,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPopover,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n/react';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import * as Rx from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { ScreenshotModePluginSetup } from 'src/plugins/screenshot_mode/public';
import { CoreStart } from '../../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../../src/plugins/navigation/public';
import { constants, ReportingStart } from '../../../../../x-pack/plugins/reporting/public';
import { JobParamsPDF } from '../../../../plugins/reporting/server/export_types/printable_pdf/types';

interface ReportingExampleAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
  reporting: ReportingStart;
  screenshotMode: ScreenshotModePluginSetup;
}

const sourceLogos = ['Beats', 'Cloud', 'Logging', 'Kibana'];

export const ReportingExampleApp = ({
  basename,
  notifications,
  http,
  reporting,
  screenshotMode,
}: ReportingExampleAppDeps) => {
  const { getDefaultLayoutSelectors } = reporting;

  // Context Menu
  const [isPopoverOpen, setPopover] = useState(false);
  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  // Async Logos
  const [logos, setLogos] = useState<string[]>([]);

  useEffect(() => {
    Rx.timer(2200)
      .pipe(takeWhile(() => logos.length < sourceLogos.length))
      .subscribe(() => {
        setLogos([...sourceLogos.slice(0, logos.length + 1)]);
      });
  });

  const getPDFJobParamsDefault = (): JobParamsPDF => {
    return {
      layout: {
        id: constants.LAYOUT_TYPES.PRESERVE_LAYOUT,
        selectors: getDefaultLayoutSelectors(),
      },
      relativeUrls: ['/app/reportingExample#/intended-visualization'],
      objectType: 'develeloperExample',
      title: 'Reporting Developer Example',
    };
  };

  const panels = [
    { id: 0, items: [{ name: 'PDF Reports', icon: 'document', panel: 1 }] },
    {
      id: 1,
      initialFocusedItemIndex: 1,
      title: 'PDF Reports',
      items: [
        { name: 'No Layout Option', icon: 'document', panel: 2 },
        { name: 'Canvas Layout Option', icon: 'canvasApp', panel: 3 },
      ],
    },
    {
      id: 2,
      title: 'No Layout Option',
      content: (
        <reporting.components.ReportingPanelPDF
          getJobParams={getPDFJobParamsDefault}
          onClose={closePopover}
        />
      ),
    },
    {
      id: 3,
      title: 'Canvas Layout Option',
      content: (
        <reporting.components.ReportingPanelPDF
          layoutOption="canvas"
          getJobParams={getPDFJobParamsDefault}
          onClose={closePopover}
        />
      ),
    },
  ];

  return (
    <Router basename={basename}>
      <I18nProvider>
        <EuiPage>
          <EuiPageBody>
            <EuiPageHeader>
              <EuiTitle size="l">
                <h1>Reporting Example</h1>
              </EuiTitle>
            </EuiPageHeader>
            <EuiPageContent>
              <EuiPageContentBody>
                <EuiText>
                  <p>Example of a Sharing menu using components from Reporting</p>

                  <EuiPopover
                    id="contextMenuExample"
                    button={<EuiButton onClick={onButtonClick}>Share</EuiButton>}
                    isOpen={isPopoverOpen}
                    closePopover={closePopover}
                    panelPaddingSize="none"
                    anchorPosition="downLeft"
                  >
                    <EuiContextMenu initialPanelId={0} panels={panels} />
                  </EuiPopover>

                  <EuiHorizontalRule />

                  <div data-shared-items-container data-shared-items-count="4">
                    <EuiFlexGroup gutterSize="l">
                      {logos.map((item, index) => (
                        <EuiFlexItem key={index} data-shared-item>
                          <EuiCard
                            icon={<EuiIcon size="xxl" type={`logo${item}`} />}
                            title={`Elastic ${item}`}
                            description="Example of a card's description. Stick to one or two sentences."
                            onClick={() => {}}
                          />
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>

                    <p>Screenshot Mode is {screenshotMode.isScreenshotMode() ? 'ON' : 'OFF'}!</p>
                  </div>
                </EuiText>
              </EuiPageContentBody>
            </EuiPageContent>
          </EuiPageBody>
        </EuiPage>
      </I18nProvider>
    </Router>
  );
};
