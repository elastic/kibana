/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { idx } from '@kbn/elastic-idx';
import { IStackframe } from '../../../../typings/es_schemas/raw/fields/Stackframe';
import { fontFamilyCode, fontSize, px, units } from '../../../style/variables';

const FileDetails = styled.div`
  color: ${theme.euiColorMediumShade};
  padding: ${px(units.half)};
  font-family: ${fontFamilyCode};
  font-size: ${fontSize};
`;
const LibraryFrameFileDetail = styled.span`
  color: ${theme.euiColorDarkShade};
`;
const AppFrameFileDetail = styled.span`
  font-weight: bold;
  color: ${theme.euiColorFullShade};
`;

interface Props {
  stackframe: IStackframe;
  isLibraryFrame: boolean;
}

const FrameHeading: React.SFC<Props> = ({ stackframe, isLibraryFrame }) => {
  const FileDetail = isLibraryFrame
    ? LibraryFrameFileDetail
    : AppFrameFileDetail;
  const lineNumber = idx(stackframe, _ => _.line.number) || 0;
  return (
    <FileDetails>
      <FileDetail>{stackframe.filename}</FileDetail> in{' '}
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
