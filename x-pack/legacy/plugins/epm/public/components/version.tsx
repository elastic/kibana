/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RequirementVersion } from '../../common/types';
import euiStyled from '../../../../common/eui_styled_components';

const CodeText = euiStyled.span`
font-family: ${props => props.theme.eui.euiCodeFontFamily}
`;
export function Version({
  className,
  version,
}: {
  className?: string;
  version: RequirementVersion;
}) {
  return <CodeText className={className}>{version}</CodeText>;
}
