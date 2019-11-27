/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useCallback, useState, useMemo } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiPage, EuiTitle, IconType } from '@elastic/eui';
import { PLUGIN } from '../../../common/constants';
import { PackageInfo } from '../../../common/types';
import { Version } from '../../components/version';
import { IconPanel } from '../../components/icon_panel';
import { useBreadcrumbs, useLinks } from '../../hooks';
import { CenterColumn, LeftColumn, RightColumn } from './layout';
import { InstallationButton } from './installation_button';
import { ConfirmPackageInstall } from './confirm_package_install';
import { NavButtonBack } from './nav_button_back';
import { useInstallPackage, useGetPackageInstallStatus } from '../../hooks';

const FullWidthNavRow = styled(EuiPage)`
  /* no left padding so link is against column left edge  */
  padding-left: 0;
`;

const Text = styled.span`
  margin-right: ${props => props.theme.eui.euiSizeM};
`;

const StyledVersion = styled(Version)`
  font-size: ${props => props.theme.eui.euiFontSizeS};
  color: ${props => props.theme.eui.euiColorDarkShade};
`;

type HeaderProps = PackageInfo & { iconType?: IconType };

export function Header(props: HeaderProps) {
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const { iconType, title, version, assets, name } = props;
  const { toListView } = useLinks();
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }, { text: title }]);
  const installPackage = useInstallPackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const installationStatus = getPackageInstallStatus(name);

  const toggleModal = useCallback(() => {
    setModalVisible(!isModalVisible);
  }, [isModalVisible]);

  const handleClickInstall = useCallback(() => {
    installPackage({ name, version, title });
    toggleModal();
  }, [installPackage, name, title, toggleModal, version]);

  const numOfAssets = useMemo(
    () =>
      Object.entries(assets).reduce(
        (acc, [serviceName, serviceNameValue]) =>
          acc +
          Object.entries(serviceNameValue).reduce(
            (acc2, [assetName, assetNameValue]) => acc2 + assetNameValue.length,
            0
          ),
        0
      ),
    [assets]
  );

  return (
    <Fragment>
      <FullWidthNavRow>
        <NavButtonBack />
      </FullWidthNavRow>
      <EuiFlexGroup>
        {iconType ? (
          <LeftColumn>
            <IconPanel iconType={iconType} />
          </LeftColumn>
        ) : null}
        <CenterColumn>
          <EuiTitle size="l">
            <h1>
              <Text>{title}</Text>
              <StyledVersion version={version} />
            </h1>
          </EuiTitle>
        </CenterColumn>
        <RightColumn>
          <EuiFlexGroup direction="column" alignItems="flexEnd">
            <EuiFlexItem grow={false}>
              <InstallationButton installationStatus={installationStatus} onClick={toggleModal} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </RightColumn>
      </EuiFlexGroup>
      {isModalVisible && (
        <ConfirmPackageInstall
          numOfAssets={numOfAssets}
          packageName={props.title}
          onCancel={toggleModal}
          onConfirm={handleClickInstall}
        />
      )}
    </Fragment>
  );
}
