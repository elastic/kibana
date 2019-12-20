/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiIcon, EuiPageHeader, EuiPanel, EuiTitle, ICON_TYPES } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { PackageInfo } from '../../../common/types';
import { NavButtonBack } from '../../components/nav_button_back';
import { getPackageInfoByKey } from '../../data';
import { useLinks } from '../../hooks';
import { AddDataSourceForm } from './add_data_source_form';

export interface AddDataSourceProps {
  pkgkey: string;
}

// TODO: change to percentages?
const SIDEBAR_WIDTH = '168px';

const PageContainer = styled.div`
  margin: 0 auto;
  width: 1200px;
`;
const PageBody = styled.div`
  min-width: 772px;
`;
const NavButtonBackWrapper = styled.div`
  padding: ${props => props.theme.eui.paddingSizes.xl} 0 ${props => props.theme.eui.paddingSizes.m}
    0;
`;
const SideBar = styled.div`
  margin-right: ${props => props.theme.eui.paddingSizes.xl};
  max-width: ${SIDEBAR_WIDTH};
`;
const IconPanel = styled(EuiPanel)`
  padding: ${props => props.theme.eui.paddingSizes.xl} !important;
  text-align: center;
  width: ${SIDEBAR_WIDTH};
  height: ${SIDEBAR_WIDTH};
`;
export function AddDataSource({ pkgkey }: AddDataSourceProps) {
  const [info, setInfo] = useState<PackageInfo | null>(null);
  const { toDetailView } = useLinks();

  useEffect(() => {
    getPackageInfoByKey(pkgkey).then(response => {
      setInfo(response);
    });
  }, [pkgkey]);

  // don't have designs for loading/empty states
  if (!info) return null;

  const { version, name, title, datasets } = info;
  const iconType = ICON_TYPES.find(key => key.toLowerCase() === `logo${name}`);

  return (
    <PageContainer>
      <NavButtonBackWrapper>
        <NavButtonBack
          href={toDetailView({ name, panel: 'data-sources', version })}
          text="Cancel"
        />
      </NavButtonBackWrapper>
      <EuiFlexGroup gutterSize="none">
        <SideBar>
          <IconPanel>
            {iconType ? <EuiIcon width="102" height="102" type={iconType} size="original" /> : null}
          </IconPanel>
        </SideBar>
        <PageBody>
          <EuiPageHeader>
            <EuiTitle size="l">
              <h1>Add {title} data source</h1>
            </EuiTitle>
          </EuiPageHeader>
          {datasets && <AddDataSourceForm package={info} />}
        </PageBody>
      </EuiFlexGroup>
    </PageContainer>
  );
}
