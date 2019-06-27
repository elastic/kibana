/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  SavedObjectsManagementAction,
  SavedObjectRecord,
} from 'ui/management/saved_objects_management';
import { i18n } from '@kbn/i18n';
import { CopyToSpaceFlyout } from '../components/copy_to_space';

export class CopyToSpaceSavedObjectsManagementAction extends SavedObjectsManagementAction {
  public id: string = 'copy_saved_objects_to_space';

  public euiAction = {
    name: i18n.translate('xpack.spaces.management.copyToSpace.actionTitle', {
      defaultMessage: 'Copy to space',
    }),
    description: i18n.translate('xpack.spaces.management.copyToSpace.actionDescription', {
      defaultMessage: 'Copy this saved object to one or more spaces',
    }),
    icon: 'spacesApp',
    type: 'icon',
    onClick: (object: SavedObjectRecord) => {
      this.start(object);
    },
  };

  public render = () => {
    if (!this.record) {
      throw new Error('No record available! `render()` was likely called before `start()`.');
    }
    return <CopyToSpaceFlyout onClose={this.onClose} object={this.record} />;
  };

  private onClose = () => {
    this.finish();
  };
}
