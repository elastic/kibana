/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { useCore } from '../hooks';

export function NavButtonBack({ href, text }: { href: string; text: string }) {
  const { theme } = useCore();
  const ButtonEmpty = styled(EuiButtonEmpty)`
    margin-right: ${theme.eui.spacerSizes.xl};
  `;
  return (
    <ButtonEmpty iconType="arrowLeft" size="xs" flush="left" href={href}>
      {text}
    </ButtonEmpty>
  );
}
