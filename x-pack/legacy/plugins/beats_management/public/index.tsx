/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as euiVars from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { I18nContext } from 'ui/i18n';
import { Provider as UnstatedProvider, Subscribe } from 'unstated';
import { EuiCallOut } from '@elastic/eui';
import { BASE_PATH } from '../common/constants';
import { Background } from './components/layouts/background';
import { BreadcrumbProvider } from './components/navigation/breadcrumb';
import { Breadcrumb } from './components/navigation/breadcrumb/breadcrumb';
import { BeatsContainer } from './containers/beats';
import { TagsContainer } from './containers/tags';
import { compose } from './lib/compose/kibana';
import { FrontendLibs } from './lib/types';
import { AppRouter } from './router';

async function startApp(libs: FrontendLibs) {
  libs.framework.renderUIAtPath(
    BASE_PATH,
    <ThemeProvider theme={{ eui: euiVars }}>
      <I18nContext>
        <HashRouter basename="/management/beats_management">
          <UnstatedProvider inject={[new BeatsContainer(libs), new TagsContainer(libs)]}>
            <BreadcrumbProvider useGlobalBreadcrumbs={libs.framework.versionGreaterThen('6.7.0')}>
              <Subscribe to={[BeatsContainer, TagsContainer]}>
                {(beats: BeatsContainer, tags: TagsContainer) => (
                  <Background>
                    <Breadcrumb
                      title={i18n.translate('xpack.beatsManagement.management.breadcrumb', {
                        defaultMessage: 'Management',
                      })}
                    />
                    <EuiCallOut
                      title="Beats Central Management has been deprecated"
                      color="warning"
                      iconType="help"
                    >
                      <p>
                        We have ceased development on Beats central management and
                        are working on a comprehensive solution to replace it.
                        Thank you for participating in the beta and providing feedback.
                        If you have any questions or concerns, please reach out to us on the
                        <a href="https://discuss.elastic.co/c/beats">Discuss forum</a>.
                        
                     
                      </p>
                    </EuiCallOut>
                    <AppRouter libs={libs} beatsContainer={beats} tagsContainer={tags} />
                  </Background>
                )}
              </Subscribe>
            </BreadcrumbProvider>
          </UnstatedProvider>
        </HashRouter>
      </I18nContext>
    </ThemeProvider>,
    libs.framework.versionGreaterThen('6.7.0') ? 'management' : 'self'
  );

  await libs.framework.waitUntilFrameworkReady();

  if (libs.framework.licenseIsAtLeast('standard')) {
    libs.framework.registerManagementSection({
      id: 'beats',
      name: i18n.translate('xpack.beatsManagement.centralManagementSectionLabel', {
        defaultMessage: 'Beats',
      }),
      iconName: 'logoBeats',
    });

    libs.framework.registerManagementUI({
      sectionId: 'beats',
      name: i18n.translate('xpack.beatsManagement.centralManagementLinkLabel', {
        defaultMessage: 'Central Management',
      }),
      basePath: BASE_PATH,
    });
  }
}

startApp(compose());
