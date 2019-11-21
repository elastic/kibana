/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { EuiFilePicker } from '@elastic/eui';
import { Loading } from '../../../../../public/components/loading/loading';
import { ArgumentStrings } from '../../../../../i18n';

const { ImageUpload: strings } = ArgumentStrings;

export const FileForm = ({ loading, onChange }) =>
  loading ? (
    <Loading animated text={strings.getImageUploading()} />
  ) : (
    <EuiFilePicker
      initialPromptText={strings.getFileUploadPrompt()}
      onChange={onChange}
      compressed
      display="default"
      className="canvasImageUpload"
      accept="image/*"
    />
  );

FileForm.propTypes = {
  loading: PropTypes.bool,
  onUpload: PropTypes.func,
};
