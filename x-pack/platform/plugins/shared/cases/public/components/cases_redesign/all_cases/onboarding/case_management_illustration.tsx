/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiImage, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
// The EUI "Case management" illustration, vendored as light/dark SVGs. The upstream asset lives
// in @elastic/eui-illustrations, which is not a Kibana dependency; if that package is adopted
// these can be replaced with <EuiIllustration type={caseManagement} />.
import caseManagementLight from '../../../../assets/case_management_light.svg';
import caseManagementDark from '../../../../assets/case_management_dark.svg';

const ILLUSTRATION_SIZE = 96;

interface Props {
  alt: string;
}

export const CaseManagementIllustration: React.FC<Props> = ({ alt }) => {
  const { colorMode } = useEuiTheme();
  const src = colorMode === 'DARK' ? caseManagementDark : caseManagementLight;

  return (
    <EuiImage
      size={ILLUSTRATION_SIZE}
      alt={alt}
      src={src}
      css={css`
        inline-size: ${ILLUSTRATION_SIZE}px;
        block-size: ${ILLUSTRATION_SIZE}px;
      `}
    />
  );
};
CaseManagementIllustration.displayName = 'CaseManagementIllustration';
