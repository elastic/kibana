/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCard,
  EuiCodeBlock,
  EuiContextMenu,
  EuiContextMenuProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { parsePath } from 'history';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, useHistory } from 'react-router-dom';
import * as Rx from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import type {
  JobAppParamsPDF,
  JobParamsPDFV2,
  JobParamsPNGV2,
} from '@kbn/reporting-plugin/common/types';
import type { ReportingStart } from '@kbn/reporting-plugin/public';
import { LayoutTypes } from '@kbn/screenshotting-plugin/public';
import { REPORTING_EXAMPLE_LOCATOR_ID } from '../../common';
import { useApplicationContext } from '../application_context';
import { ROUTES } from '../constants';
import type { MyForwardableState } from '../types';

interface ReportingExampleAppProps {
  basename: string;
  reporting: ReportingStart;
  screenshotMode: ScreenshotModePluginSetup;
}

const sourceLogos = ['Beats', 'Cloud', 'Logging', 'Kibana'];

export const Main = ({ basename, reporting, screenshotMode }: ReportingExampleAppProps) => {
  const history = useHistory();
  const { forwardedState } = useApplicationContext();
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('forwardedState', forwardedState);
  }, [forwardedState]);

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

  const getPDFJobParamsDefault = (): JobAppParamsPDF => {
    return {
      layout: {
        id: LayoutTypes.PRESERVE_LAYOUT,
      },
      relativeUrls: ['/app/reportingExample#/intended-visualization'],
      objectType: 'develeloperExample',
      title: 'Reporting Developer Example',
    };
  };

  const getPDFJobParamsDefaultV2 = (): JobParamsPDFV2 => {
    return {
      version: '8.0.0',
      layout: {
        id: LayoutTypes.PRESERVE_LAYOUT,
      },
      locatorParams: [
        { id: REPORTING_EXAMPLE_LOCATOR_ID, version: '0.5.0', params: { myTestState: {} } },
      ],
      objectType: 'develeloperExample',
      title: 'Reporting Developer Example',
      browserTimezone: moment.tz.guess(),
    };
  };

  const getPNGJobParamsDefaultV2 = (): JobParamsPNGV2 => {
    return {
      version: '8.0.0',
      layout: {
        id: LayoutTypes.PRESERVE_LAYOUT,
      },
      locatorParams: {
        id: REPORTING_EXAMPLE_LOCATOR_ID,
        version: '0.5.0',
        params: { myTestState: {} },
      },
      objectType: 'develeloperExample',
      title: 'Reporting Developer Example',
      browserTimezone: moment.tz.guess(),
    };
  };

  const getCaptureTestPNGJobParams = (): JobParamsPNGV2 => {
    return {
      version: '8.0.0',
      layout: {
        id: LayoutTypes.PRESERVE_LAYOUT,
      },
      locatorParams: {
        id: REPORTING_EXAMPLE_LOCATOR_ID,
        version: '0.5.0',
        params: { captureTest: 'A' } as MyForwardableState,
      },
      objectType: 'develeloperExample',
      title: 'Reporting Developer Example',
      browserTimezone: moment.tz.guess(),
    };
  };

  const getCaptureTestPDFJobParams = (print: boolean) => (): JobParamsPDFV2 => {
    return {
      version: '8.0.0',
      layout: {
        id: print ? LayoutTypes.PRINT : LayoutTypes.PRESERVE_LAYOUT,
        dimensions: {
          // Magic numbers based on height of components not rendered on this screen :(
          height: 2400,
          width: 1822,
        },
      },
      locatorParams: [
        {
          id: REPORTING_EXAMPLE_LOCATOR_ID,
          version: '0.5.0',
          params: { captureTest: 'A' } as MyForwardableState,
        },
      ],
      objectType: 'develeloperExample',
      title: 'Reporting Developer Example',
      browserTimezone: moment.tz.guess(),
    };
  };

  const panels: EuiContextMenuProps['panels'] = [
    {
      id: 0,
      items: [
        { name: 'PDF Reports', icon: 'document', panel: 1 },
        { name: 'PNG Reports', icon: 'document', panel: 7 },
        { name: 'Capture test', icon: 'document', panel: 8, 'data-test-subj': 'captureTestPanel' },
      ],
    },
    {
      id: 1,
      initialFocusedItemIndex: 1,
      title: 'PDF Reports',
      items: [
        { name: 'Default layout', icon: 'document', panel: 2 },
        { name: 'Default layout V2', icon: 'document', panel: 4 },
        { name: 'Canvas Layout Option', icon: 'canvasApp', panel: 3 },
      ],
    },
    {
      id: 8,
      initialFocusedItemIndex: 0,
      title: 'Capture test',
      items: [
        {
          name: 'Capture test A - PNG',
          icon: 'document',
          panel: 9,
          'data-test-subj': 'captureTestPNG',
        },
        {
          name: 'Capture test A - PDF',
          icon: 'document',
          panel: 10,
          'data-test-subj': 'captureTestPDF',
        },
        {
          name: 'Capture test A - PDF print optimized',
          icon: 'document',
          panel: 11,
          'data-test-subj': 'captureTestPDFPrint',
        },
      ],
    },
    {
      id: 7,
      initialFocusedItemIndex: 0,
      title: 'PNG Reports',
      items: [{ name: 'Default layout V2', icon: 'document', panel: 5 }],
    },
    {
      id: 2,
      title: 'Default layout',
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
    {
      id: 4,
      title: 'Default layout V2',
      content: (
        <reporting.components.ReportingPanelPDFV2
          getJobParams={getPDFJobParamsDefaultV2}
          onClose={closePopover}
        />
      ),
    },
    {
      id: 5,
      title: 'Default layout V2',
      content: (
        <reporting.components.ReportingPanelPNGV2
          getJobParams={getPNGJobParamsDefaultV2}
          onClose={closePopover}
        />
      ),
    },
    {
      id: 9,
      title: 'Test A',
      content: (
        <reporting.components.ReportingPanelPNGV2
          getJobParams={getCaptureTestPNGJobParams}
          onClose={closePopover}
        />
      ),
    },
    {
      id: 10,
      title: 'Test A',
      content: (
        <reporting.components.ReportingPanelPDFV2
          getJobParams={getCaptureTestPDFJobParams(false)}
          onClose={closePopover}
        />
      ),
    },
    {
      id: 11,
      title: 'Test A',
      content: (
        <reporting.components.ReportingPanelPDFV2
          layoutOption="print"
          getJobParams={getCaptureTestPDFJobParams(true)}
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
                <EuiTitle>
                  <h2>Example of a Sharing menu using components from Reporting</h2>
                </EuiTitle>
                <EuiSpacer />
                <EuiText>
                  <EuiFlexGroup alignItems="center" gutterSize="l">
                    <EuiFlexItem grow={false}>
                      <EuiPopover
                        id="contextMenuExample"
                        button={
                          <EuiButton data-test-subj="shareButton" onClick={onButtonClick}>
                            Share
                          </EuiButton>
                        }
                        isOpen={isPopoverOpen}
                        closePopover={closePopover}
                        panelPaddingSize="none"
                        anchorPosition="downLeft"
                      >
                        <EuiContextMenu initialPanelId={0} panels={panels} />
                      </EuiPopover>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <EuiLink href={history.createHref(parsePath(ROUTES.captureTest))}>
                          Go to capture test
                        </EuiLink>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiHorizontalRule />

                  <div data-shared-items-container data-shared-items-count="5">
                    <EuiFlexGroup gutterSize="l">
                      <EuiFlexItem data-shared-item>
                        {forwardedState ? (
                          <>
                            <EuiText>
                              <p>
                                <strong>Forwarded app state</strong>
                              </p>
                            </EuiText>
                            <EuiCodeBlock>{JSON.stringify(forwardedState)}</EuiCodeBlock>
                          </>
                        ) : (
                          <>
                            <EuiText>
                              <p>
                                <strong>No forwarded app state found</strong>
                              </p>
                            </EuiText>
                            <EuiCodeBlock>{'{}'}</EuiCodeBlock>
                          </>
                        )}
                      </EuiFlexItem>
                      {logos.map((item, index) => (
                        <EuiFlexItem
                          key={index}
                          data-shared-item
                          data-shared-render-error
                          data-render-error="This is an example error"
                        >
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
