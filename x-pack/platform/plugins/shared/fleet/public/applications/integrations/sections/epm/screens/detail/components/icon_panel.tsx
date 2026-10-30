/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiIcon, EuiPanel } from '@elastic/eui';

import type { UsePackageIconType } from '../../../../../hooks';
import { usePackageIconType } from '../../../../../hooks';
import { Loading } from '../../../../../components';

// Width in px of the icon panel: a 6x base icon plus XL padding on both sides.
// Exported so layouts that sit beside the panel can stay aligned with it.
export const getIconPanelWidth = (sizeBase: string, sizeXL: string) =>
  parseFloat(sizeBase) * 6 + parseFloat(sizeXL) * 2;

const Panel = styled(EuiPanel)`
  padding: ${(props) => props.theme.eui.euiSizeXL};
  width: ${(props) => getIconPanelWidth(props.theme.eui.euiSize, props.theme.eui.euiSizeXL)}px;
  svg,
  img {
    height: ${(props) => parseFloat(props.theme.eui.euiSize) * 6}px;
    width: ${(props) => parseFloat(props.theme.eui.euiSize) * 6}px;
  }
  .euiFlexItem {
    height: ${(props) => parseFloat(props.theme.eui.euiSize) * 6}px;
    justify-content: center;
  }
`;

export function IconPanel({
  packageName,
  integrationName,
  version,
  icons,
}: Pick<UsePackageIconType, 'packageName' | 'integrationName' | 'version' | 'icons'>) {
  const iconType = usePackageIconType({ packageName, integrationName, version, icons });

  return (
    <Panel>
      <EuiIcon type={iconType} size="original" aria-hidden={true} />
    </Panel>
  );
}

export function LoadingIconPanel() {
  return (
    <Panel>
      <Loading />
    </Panel>
  );
}

export function ErrorIconPanel() {
  return (
    <Panel>
      <EuiIcon type="error" size="original" aria-hidden={true} />
    </Panel>
  );
}

export interface MiniIconProps
  extends Pick<UsePackageIconType, 'packageName' | 'integrationName' | 'version' | 'icons'> {
  size?: number; // Optional size multiplier
}

export function MiniIcon({ packageName, integrationName, version, icons }: MiniIconProps) {
  const iconType = usePackageIconType({ packageName, integrationName, version, icons });

  return <EuiIcon type={iconType} size="l" aria-hidden={true} />;
}
