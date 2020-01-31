/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import template from 'plugins/reporting/views/management/jobs.html';
import React from 'react';
import ReactDOM from 'react-dom';
import { render, unmountComponentAtNode } from 'react-dom';
import { HashRouter as Router, Switch, Route, Link } from 'react-router-dom';
import { I18nContext } from 'ui/i18n';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';
import { npSetup } from 'ui/new_platform';
import routes from 'ui/routes';
import { ReportListing } from '../../components/report_listing';

const REACT_ANCHOR_DOM_ELEMENT_ID = 'reportListingAnchor';
const management = npSetup.plugins.management;

routes.defaults(/\/management/, {
  resolve: {
    reportingManagementSection: () => {
      const testSection = management.sections.getSection('kibana');

      testSection!.registerApp({
        id: 'test-management',
        title: 'Super-dank plugin',
        order: 15,
        mount(params) {
          params.setBreadcrumbs([{ text: 'Super-dank plugin' }]);
          ReactDOM.render(
            <Router>
              <h1 data-test-subj="test-management-header">Hello from management test plugin</h1>
              <Switch>
                <Route exact path={`${params.basePath}`}>
                  <Link to={`${params.basePath}/one`} data-test-subj="test-management-link-one">
                    Link to /one
                  </Link>
                </Route>
                <Route path={`${params.basePath}/one`}>
                  <Link to={`${params.basePath}`} data-test-subj="test-management-link-basepath">
                    Link to basePath
                  </Link>
                </Route>
              </Switch>
            </Router>,
            params.element
          );

          return () => {
            ReactDOM.unmountComponentAtNode(params.element);
          };
        },
      });

      // if (showReportingLinks) {
      //   const enableReportingLinks = xpackInfo.get('features.reporting.management.enableLinks');
      //   const tooltipMessage = xpackInfo.get('features.reporting.management.message');

      //   let url;
      //   let tooltip;
      //   if (enableReportingLinks) {
      //     url = '#/management/kibana/reporting';
      //   } else {
      //     tooltip = tooltipMessage;
      //   }

      //   return kibanaManagementSection.register('reporting', {
      //     order: 15,
      //     display: i18n.translate('xpack.reporting.management.reportingTitle', {
      //       defaultMessage: 'Reporting',
      //     }),
      //     url,
      //     tooltip,
      //   });
      // }
    },
  },
});

routes.when('/management/kibana/reporting', {
  template,
  k7Breadcrumbs: () => [
    MANAGEMENT_BREADCRUMB,
    {
      text: i18n.translate('xpack.reporting.breadcrumb', {
        defaultMessage: 'Reporting',
      }),
    },
  ],
  // @ts-ignore ?
  controllerAs: 'jobsCtrl',
  controller($scope, kbnUrl) {
    $scope.$$postDigest(() => {
      const node = document.getElementById(REACT_ANCHOR_DOM_ELEMENT_ID);
      if (!node) {
        return;
      }

      render(
        <I18nContext>
          <ReportListing
            badLicenseMessage={xpackInfo.get('features.reporting.management.message')}
            showLinks={xpackInfo.get('features.reporting.management.showLinks')}
            enableLinks={xpackInfo.get('features.reporting.management.enableLinks')}
            redirect={kbnUrl.redirect}
          />
        </I18nContext>,
        node
      );
    });

    $scope.$on('$destroy', () => {
      const node = document.getElementById(REACT_ANCHOR_DOM_ELEMENT_ID);
      if (node) {
        unmountComponentAtNode(node);
      }
    });
  },
});
