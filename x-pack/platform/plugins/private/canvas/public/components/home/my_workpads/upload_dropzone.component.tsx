/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
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
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(
    () => css`
      &.canvasWorkpad__dropzone--active {
        background-color: ${euiTheme.colors.lightestShade};
        border-color: ${euiTheme.colors.lightShade};
      }
    `,
    [euiTheme]
  );

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
          css={styles}
        >
          {children}
        </div>
      )}
    </Dropzone>
  );
};
