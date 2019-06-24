/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { EuiFilePicker } from '@elastic/eui';
import { Loading } from '../../../../../public/components/loading/loading';

export const FileForm = ({ loading, onChange }) =>
  loading ? (
    <Loading animated text="Image uploading" />
  ) : (
    <EuiFilePicker
      initialPromptText="Select or drag and drop an image"
      onChange={onChange}
      compressed
      className="canvasImageUpload"
      accept="image/*"
    />
  );

FileForm.propTypes = {
  loading: PropTypes.bool,
  onUpload: PropTypes.func,
};
