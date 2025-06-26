/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
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
  const dropFn = (acceptedFiles: File[]) => {
    const fileList = acceptedFiles as unknown as FileList;
    onDrop(fileList);
  };
  return (
    <Dropzone {...{ onDrop: dropFn, disabled }} noClick>
      {({ getRootProps, isDragActive }) => (
        <div
          {...getRootProps({
            className: `canvasWorkpad__dropzone${
              isDragActive ? ' canvasWorkpad__dropzone--active' : ''
            }`,
          })}
        >
          {children}
        </div>
      )}
    </Dropzone>
  );
};
