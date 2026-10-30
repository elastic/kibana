/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import semverLt from 'semver/functions/lt';
import { EuiFlexItem } from '@elastic/eui';

import {
  getLogsdbColumnarNotReadyDataStreams,
  isLogsdbColumnarDefault,
} from '../../../../../../../../../common/services';
import type { PackageInfo } from '../../../../../../types';
import { useGetPackageInfoByKeyQuery } from '../../../../../../hooks';

import { ColumnarIndexModeSwitch } from './columnar_index_mode_switch';

interface Props {
  packageInfo: PackageInfo;
  /** The columnar index mode picked on this page; `undefined` until the switch is used. */
  logsdbColumnar?: boolean;
  /** The page applies the choice when it saves. */
  onLogsdbColumnarChange: (enabled: boolean) => void;
}

/**
 * The columnar index mode switch of an integration, as an item of the advanced options. Nothing
 * is rendered for an integration without logs data streams.
 */
export const ColumnarIndexModeSetting: React.FunctionComponent<Props> = ({
  packageInfo,
  logsdbColumnar,
  onLogsdbColumnarChange,
}) => {
  // One choice per installed integration, stored on the installation and set through the package
  // API when the page is saved. It can only be turned on when every logs data stream of the
  // installed version declares readiness, which is what the API checks. A policy being edited can
  // still be on an older version than the installed one. A newer version on the add page is
  // installed when the page is saved, so its own readiness applies.
  const installationInfo =
    'installationInfo' in packageInfo ? packageInfo.installationInfo : undefined;
  const installedVersion = installationInfo?.version;
  const isPolicyBehindInstallation =
    !!installedVersion && semverLt(packageInfo.version, installedVersion);
  const { data: installedPackageData } = useGetPackageInfoByKeyQuery(
    packageInfo.name,
    installedVersion,
    { full: true },
    { enabled: isPolicyBehindInstallation }
  );
  const columnarPackageInfo: PackageInfo =
    isPolicyBehindInstallation && installedPackageData?.item
      ? installedPackageData.item
      : packageInfo;
  const logsDataStreams = useMemo(
    () =>
      columnarPackageInfo.type === 'input'
        ? []
        : (columnarPackageInfo.data_streams ?? []).filter(
            (dataStream) => dataStream.type === 'logs'
          ),
    [columnarPackageInfo]
  );
  const isNotReady = useMemo(
    () => getLogsdbColumnarNotReadyDataStreams(columnarPackageInfo, logsDataStreams).length > 0,
    [columnarPackageInfo, logsDataStreams]
  );
  const isEnabled =
    logsdbColumnar ??
    (installationInfo
      ? installationInfo.logsdb_columnar_enabled === true
      : isLogsdbColumnarDefault(packageInfo));

  if (logsDataStreams.length === 0) {
    return null;
  }

  return (
    <EuiFlexItem>
      <ColumnarIndexModeSwitch
        checked={isEnabled}
        notReady={isNotReady}
        onChange={() => onLogsdbColumnarChange(!isEnabled)}
      />
    </EuiFlexItem>
  );
};
