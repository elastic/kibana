/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
// @ts-expect-error untyped library
import Dropzone from 'react-dropzone';

import './upload_dropzone.scss';

export interface Props {
  disabled?: boolean;
  onDrop?: (files: FileList) => void;
}

export const UploadDropzone: FC<PropsWithChildren<Props>> = ({
  onDrop = () => {},
  disabled,
  children,
}) => {
  return (
    <Dropzone
      {...{ onDrop, disabled }}
      disableClick
      className="canvasWorkpad__dropzone"
      activeClassName="canvasWorkpad__dropzone--active"
    >
      {children}
    </Dropzone>
  );
};
