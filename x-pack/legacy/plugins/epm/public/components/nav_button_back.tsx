/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButtonEmptyProps, EuiButtonEmpty } from '@elastic/eui';
import styled from 'styled-components';
import React from 'react';
import { useLinks, useCore } from '../hooks';

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
