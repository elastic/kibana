/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { FileUpload } from './file_upload';

export default {
  title: 'components/FileUpload',
};

export const Default = {
  render: () => <FileUpload onUpload={action('onUpload')} />,
  name: 'default',
};
