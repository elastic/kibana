/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { IStackframe } from '../../../../typings/es_schemas/raw/fields/Stackframe';
import { fontFamilyCode, fontSize, px, units } from '../../../style/variables';

const FileDetails = styled.div`
  color: ${theme.euiColorDarkShade};
  padding: ${px(units.half)} 0;
  font-family: ${fontFamilyCode};
  font-size: ${fontSize};
`;

const LibraryFrameFileDetail = styled.span`
  color: ${theme.euiColorDarkShade};
`;

const AppFrameFileDetail = styled.span`
  color: ${theme.euiColorFullShade};
`;

interface Props {
  stackframe: IStackframe;
  isLibraryFrame: boolean;
}

const FrameHeading: React.FC<Props> = ({ stackframe, isLibraryFrame }) => {
  const FileDetail = isLibraryFrame
    ? LibraryFrameFileDetail
    : AppFrameFileDetail;
  const lineNumber = stackframe.line.number;

  const name =
    'filename' in stackframe ? stackframe.filename : stackframe.classname;

  return (
    <FileDetails>
      <FileDetail>{name}</FileDetail> in{' '}
      <FileDetail>{stackframe.function}</FileDetail>
      {lineNumber > 0 && (
        <Fragment>
          {' at '}
          <FileDetail>line {stackframe.line.number}</FileDetail>
        </Fragment>
      )}
    </FileDetails>
  );
};

export { FrameHeading };
