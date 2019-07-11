/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import 'plugins/spaces/views/management/page_routes';
import React from 'react';
import {
  management,
  PAGE_SUBTITLE_COMPONENT,
  PAGE_TITLE_COMPONENT,
  registerSettingsComponent,
  // @ts-ignore
} from 'ui/management';
// @ts-ignore
import routes from 'ui/routes';
import { getSpacesManager } from 'plugins/spaces/lib';
import { AdvancedSettingsSubtitle } from './components/advanced_settings_subtitle';
import { AdvancedSettingsTitle } from './components/advanced_settings_title';
import { waitForSpacesNPInit } from '../../hacks/init_np_plugin';

const MANAGE_SPACES_KEY = 'spaces';

routes.defaults(/\/management/, {
  resolve: {
    spacesManagementSection() {
      function getKibanaSection() {
        return management.getSection('kibana');
      }

      function deregisterSpaces() {
        getKibanaSection().deregister(MANAGE_SPACES_KEY);
      }

      function ensureSpagesRegistered() {
        const kibanaSection = getKibanaSection();

        if (!kibanaSection.hasItem(MANAGE_SPACES_KEY)) {
          kibanaSection.register(MANAGE_SPACES_KEY, {
            name: 'spacesManagementLink',
            order: 10,
            display: i18n.translate('xpack.spaces.displayName', {
              defaultMessage: 'Spaces',
            }),
            url: `#/management/spaces/list`,
          });
        }

        const getActiveSpace = async () => {
          await waitForSpacesNPInit;
          return getSpacesManager().getActiveSpace();
        };

        const PageTitle = () => <AdvancedSettingsTitle getActiveSpace={getActiveSpace} />;
        registerSettingsComponent(PAGE_TITLE_COMPONENT, PageTitle, true);

        const SubTitle = () => <AdvancedSettingsSubtitle getActiveSpace={getActiveSpace} />;
        registerSettingsComponent(PAGE_SUBTITLE_COMPONENT, SubTitle, true);
      }

      deregisterSpaces();

      ensureSpagesRegistered();
    },
  },
});
