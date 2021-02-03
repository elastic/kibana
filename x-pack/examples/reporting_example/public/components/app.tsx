import {
  EuiCard,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n/react';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import * as Rx from 'rxjs';
import { takeWhile } from 'rxjs/operators';
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
}

const sourceLogos = ['Beats', 'Cloud', 'Logging', 'Kibana'];

export const ReportingExampleApp = ({
  basename,
  notifications,
  http,
  reporting,
}: ReportingExampleAppDeps) => {
  const { getDefaultLayoutSelectors, ReportingAPIClient } = reporting;
  const [logos, setLogos] = useState<string[]>([]);

  useEffect(() => {
    Rx.timer(2200)
      .pipe(takeWhile(() => logos.length < sourceLogos.length))
      .subscribe(() => {
        setLogos([...sourceLogos.slice(0, logos.length + 1)]);
      });
  });

  const getPDFJobParams = (): JobParamsPDF => {
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

  // Render the application DOM.
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
                  <p>
                    Use the <EuiCode>ReportingStart.components.ScreenCapturePanel</EuiCode>{' '}
                    component to add the Reporting panel to your page.
                  </p>

                  <EuiHorizontalRule />

                  <EuiFlexGroup>
                    <EuiFlexItem grow={false}>
                      <EuiPanel>
                        <reporting.components.ScreenCapturePanel
                          apiClient={new ReportingAPIClient(http)}
                          toasts={notifications.toasts}
                          reportType={constants.PDF_REPORT_TYPE}
                          getJobParams={getPDFJobParams}
                          objectId="Visualization:Id:ToEnsure:Visualization:IsSaved"
                        />
                      </EuiPanel>
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiHorizontalRule />

                  <p>
                    The logos below are in a <EuiCode>data-shared-items-container</EuiCode> element
                    for Reporting.
                  </p>

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
