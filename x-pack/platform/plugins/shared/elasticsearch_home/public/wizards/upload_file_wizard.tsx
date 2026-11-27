/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { WizardPlaceholder } from './wizard_placeholder';
import { UPLOAD_FILE_WIZARD_TITLE } from './wizard_titles';

export const UploadFileWizard = () => (
  <WizardPlaceholder
    title={UPLOAD_FILE_WIZARD_TITLE}
    testSubj="elasticsearchHomeUploadFileWizard"
  />
);
