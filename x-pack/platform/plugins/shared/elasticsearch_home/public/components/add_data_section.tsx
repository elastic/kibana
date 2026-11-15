/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHomeConfig, useHomeServices, useTelemetryId } from '../context';
import type { HomeAddDataLink } from '../types';
import { addDataCard } from './add_data_section_styles';

export const AddDataSection = () => {
  const { application } = useHomeServices();
  const { primaryAddDataLink } = useHomeConfig();
  const getTelemetryId = useTelemetryId();

  const addDataLinks: HomeAddDataLink[] = [
    ...(primaryAddDataLink ? [primaryAddDataLink] : []),
    {
      key: 'devTools',
      iconType: 'code',
      label: i18n.translate('xpack.elasticsearchHome.home.addData.devTools', {
        defaultMessage: 'Query your data in Console',
      }),
      onClick: () => application.navigateToApp('dev_tools'),
      testSubj: 'addDataDevToolsLink',
      telemetryId: getTelemetryId('addData-devTools'),
    },
    {
      key: 'sampleData',
      iconType: 'unarchive',
      label: i18n.translate('xpack.elasticsearchHome.home.addData.sampleData', {
        defaultMessage: 'Browse sample data sets',
      }),
      onClick: () => application.navigateToApp('home', { path: '#/tutorial_directory/sampleData' }),
      testSubj: 'addDataSampleDataLink',
      telemetryId: getTelemetryId('addData-sampleData'),
    },
    {
      key: 'uploadFile',
      iconType: 'upload',
      label: i18n.translate('xpack.elasticsearchHome.home.addData.uploadFile', {
        defaultMessage: 'Upload a file',
      }),
      onClick: () =>
        application.navigateToApp('home', { path: '#/tutorial_directory/fileDataViz' }),
      testSubj: 'addDataUploadFileLink',
      telemetryId: getTelemetryId('addData-uploadFile'),
    },
  ];

  return (
    <>
      <EuiTitle size="xxs">
        <h2>
          {i18n.translate('xpack.elasticsearchHome.home.addData.title', {
            defaultMessage: 'Add data',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.elasticsearchHome.home.addData.description', {
            defaultMessage: 'Explore various options to add data.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup component="ul" direction="column" gutterSize="s">
        {addDataLinks.map(({ key, iconType, label, onClick, testSubj, telemetryId }) => (
          <EuiFlexItem component="li" key={key}>
            <EuiPanel
              css={addDataCard}
              hasBorder
              paddingSize="m"
              onClick={onClick}
              data-test-subj={testSubj}
              data-telemetry-id={telemetryId}
            >
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={iconType} aria-hidden />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">{label}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
