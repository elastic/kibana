/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButtonEmpty, EuiButtonEmptyProps } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { useCore, useLinks } from '../../hooks';

export function NavButtonBack() {
  const { toListView } = useLinks();
  const { theme } = useCore();
  const ButtonEmpty = styled(EuiButtonEmpty).attrs<EuiButtonEmptyProps>({
    href: toListView(),
  })`
    margin-right: ${theme.eui.spacerSizes.xl};
  `;

  return (
    <ButtonEmpty iconType="arrowLeft" size="xs" flush="left">
      Browse Packages
    </ButtonEmpty>
  );
}
