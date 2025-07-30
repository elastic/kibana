/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilePicker } from '@elastic/eui';
import PropTypes from 'prop-types';
import type { FunctionComponent } from 'react';
import React from 'react';

interface Props {
  /** Optional ID of the component */
  id?: string;
  /** Optional className of the component */
  className?: string;
  /** Function to invoke when the file is successfully uploaded */
  onUpload: () => void;
}

export const FileUpload: FunctionComponent<Props> = (props) => (
  <EuiFilePicker compressed id={props.id} className={props.className} onChange={props.onUpload} />
);

FileUpload.defaultProps = {
  id: '',
  className: 'canvasFileUpload',
};

FileUpload.propTypes = {
  /** Optional ID of the component */
  id: PropTypes.string,
  /** Optional className of the component */
  className: PropTypes.string,
  /** Function to invoke when the file is successfully uploaded */
  onUpload: PropTypes.func.isRequired,
};

FileUpload.displayName = 'FileUpload';
