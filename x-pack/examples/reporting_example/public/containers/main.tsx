/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useEffect, useState } from 'react';
import * as Rx from 'rxjs';
import { takeWhile } from 'rxjs/operators';

import {
  EuiButton,
  EuiCard,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiModal,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  JobParamsPDFDeprecated,
  JobParamsPDFV2,
} from '@kbn/reporting-export-types-pdf-common';
import { JobParamsPNGV2 } from '@kbn/reporting-export-types-png-common';
import type { ReportingStart } from '@kbn/reporting-plugin/public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import { Router, useHistory } from 'react-router-dom';

import { REPORTING_EXAMPLE_LOCATOR_ID } from '../../common';
import { useApplicationContext } from '../application_context';
import type { MyForwardableState } from '../types';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { I18nStart, OverlayStart, ThemeServiceSetup } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { parsePath } from 'history';
import { ROUTES } from '../constants';
import { ReportingModalContent } from '@kbn/reporting-public/share/share_context_menu/reporting_panel_content_lazy';

interface ReportingExampleAppProps {
  basename: string;
  reporting: ReportingStart;
  screenshotMode: ScreenshotModePluginSetup;
  overlays: OverlayStart;
  i18n: I18nStart;
  theme: ThemeServiceSetup;
  toasts: ToastsSetup;
}

const sourceLogos = ['Beats', 'Cloud', 'Logging', 'Kibana'];

export const Main = ({
  basename,
  screenshotMode,
  reportingAPIClient,
  toasts,
  overlays,
  i18n,
  theme,
}: ReportingExampleAppProps) => {
  const history = useHistory();
  const { forwardedState } = useApplicationContext();
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('forwardedState', forwardedState);
  }, [forwardedState]);

  const openModal = () => {
    const session = overlays.openModal(
      toMountPoint(
        <EuiModal
          id="contextMenuExample"
          onClose={() => {
            session.close();
            setIsModalOpen(false);
          }}
        >
          {getTabs()}
        </EuiModal>,
        { i18n, theme }
      ),
      { 'data-test-subj': 'share-modal-reporting-example' }
    );
  };
  // Open the Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const onButtonClick = () => {
    setIsModalOpen(!isModalOpen);
    openModal();
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

  const getPDFJobParamsDefault = (): JobParamsPDFDeprecated => {
    return {
      layout: { id: 'preserve_layout' },
      relativeUrls: ['/app/reportingExample#/intended-visualization'],
      objectType: 'develeloperExample',
      title: 'Reporting Developer Example',
      browserTimezone: 'UTC',
      version: '1',
    };
  };

  const getPDFJobParamsDefaultV2 = (): JobParamsPDFV2 => {
    return {
      version: '8.0.0',
      layout: { id: 'preserve_layout' },
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
      layout: { id: 'preserve_layout' },
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
      layout: { id: 'preserve_layout' },
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
        id: print ? 'print' : 'preserve_layout',
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

  const getTabs =  () => {[
    {
      id: 0,
      name: 'PDF Reports',
      content: (
        <ReportingModalContent apiClient={} toasts={undefined} uiSettings={undefined} requiresSavedState={false} onClose={} theme={undefined} objectType={''}} />
        )
    },
    {
      id: 0,
      name: 'PNG Reports',
      content: ()
    },
    {
      id: 0,
      name: 'Capture test',
      content: (
        'data-test-subj': 'captureTestPanel'
      )
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
      id: 3,
      title: 'Canvas Layout Option',
      content: (
        <reporting.components.ReportingPanelPDFV2
          layoutOption="canvas"
          getJobParams={getPDFJobParamsDefault}
        />
      ),
    },
    {
      id: 4,
      title: 'Default layout V2',
      content: (
        <reporting.components.ReportingPanelPDFV2
          getJobParams={getPDFJobParamsDefaultV2}
        />
      ),
    },
    {
      id: 5,
      title: 'Default layout V2',
      content: (
        <reporting.components.ReportingModalPNGV2
          getJobParams={getPNGJobParamsDefaultV2}
        />
      ),
    },
    {
      id: 9,
      title: 'Test A',
      content: (
        <reporting.components.ReportingModalPNGV2
          getJobParams={getCaptureTestPNGJobParams}
        />
      ),
    },
    {
      id: 10,
      title: 'Test A',
      content: (
        <reporting.components.ReportingModalPDFV2
          getJobParams={getCaptureTestPDFJobParams(false)}
        />
      ),
    },
    {
      id: 11,
      title: 'Test A',
      content: (
        <reporting.components.ReportingModalPDFV2
          layoutOption="print"
          getJobParams={getCaptureTestPDFJobParams(true)}
        />
      ),
    },
  ]};

  return (
    // <Router basename={basename}>
    <I18nProvider>
      <EuiPage>
        <EuiPageBody>
          <EuiPageHeader>
            <EuiTitle size="l">
              <h1>Reporting Example</h1>
            </EuiTitle>
          </EuiPageHeader>
          <EuiPageSection>
            <EuiTitle>
              <h2>Example of a Sharing menu using components from Reporting</h2>
            </EuiTitle>
            <EuiSpacer />
            <EuiText>
              <EuiFlexGroup alignItems="center" gutterSize="l">
                <EuiFlexItem grow={false}>
                  <EuiButton data-test-subj="shareButton" onClick={onButtonClick}>
                    Share
                  </EuiButton>
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
          </EuiPageSection>
        </EuiPageBody>
      </EuiPage>
    </I18nProvider>
    // </Router>
  );
};
