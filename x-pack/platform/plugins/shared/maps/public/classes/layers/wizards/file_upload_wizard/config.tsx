/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { LayerWizard, RenderWizardArguments } from '../layer_wizard_registry';
import { ClientFileCreateSourceEditor, UPLOAD_STEPS } from './wizard';
import { getFileUpload } from '../../../../kibana_services';
import { WIZARD_ID } from '../../../../../common/constants';

export const uploadLayerWizardConfig: LayerWizard = {
  id: WIZARD_ID.GEO_FILE,
  order: 10,
  categories: [],
  description: i18n.translate('xpack.maps.fileUploadWizard.description', {
    defaultMessage: 'Index GeoJSON and Shapefile data in Elasticsearch',
  }),
  disabledReason: i18n.translate('xpack.maps.fileUploadWizard.disabledDesc', {
    defaultMessage:
      'Unable to upload files, you are missing the Kibana privilege "Data View Management".',
  }),
  getIsDisabled: async () => {
    const hasImportPermission = await getFileUpload().hasImportPermission({
      checkCreateDataView: true,
      checkHasManagePipeline: false,
    });
    return !hasImportPermission;
  },
  icon: 'importAction',
  prerequisiteSteps: [
    {
      id: UPLOAD_STEPS.CONFIGURE_UPLOAD,
      label: i18n.translate('xpack.maps.fileUploadWizard.configureUploadLabel', {
        defaultMessage: 'Import file',
      }),
    },
    {
      id: UPLOAD_STEPS.UPLOAD,
      label: i18n.translate('xpack.maps.fileUploadWizard.uploadLabel', {
        defaultMessage: 'Importing file',
      }),
    },
    {
      id: UPLOAD_STEPS.ADD_DOCUMENT_LAYER,
      label: i18n.translate('xpack.maps.fileUploadWizard.configureDocumentLayerLabel', {
        defaultMessage: 'Add as document layer',
      }),
    },
  ],
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <ClientFileCreateSourceEditor {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.fileUploadWizard.title', {
    defaultMessage: 'Upload file',
  }),
};
