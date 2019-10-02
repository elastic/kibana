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
} from 'ui/management';
import { SavedObjectsManagementActionRegistry } from 'ui/management/saved_objects_management';
// @ts-ignore
import routes from 'ui/routes';
import { SpacesManager } from '../../lib';
import { AdvancedSettingsSubtitle } from './components/advanced_settings_subtitle';
import { AdvancedSettingsTitle } from './components/advanced_settings_title';
import { CopyToSpaceSavedObjectsManagementAction } from '../../lib/copy_saved_objects_to_space';

const MANAGE_SPACES_KEY = 'spaces';

routes.defaults(/\/management/, {
  resolve: {
    spacesManagementSection(activeSpace: any, serverBasePath: string) {
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

        // Customize Saved Objects Management
        const action = new CopyToSpaceSavedObjectsManagementAction(
          new SpacesManager(serverBasePath),
          activeSpace.space
        );
        // This route resolve function executes any time the management screen is loaded, and we want to ensure
        // that this action is only registered once.
        if (!SavedObjectsManagementActionRegistry.has(action.id)) {
          SavedObjectsManagementActionRegistry.register(action);
        }

        // Customize Advanced Settings
        const PageTitle = () => <AdvancedSettingsTitle space={activeSpace.space} />;
        registerSettingsComponent(PAGE_TITLE_COMPONENT, PageTitle, true);

        const SubTitle = () => <AdvancedSettingsSubtitle space={activeSpace.space} />;
        registerSettingsComponent(PAGE_SUBTITLE_COMPONENT, SubTitle, true);
      }

      deregisterSpaces();

      ensureSpagesRegistered();
    },
  },
});
