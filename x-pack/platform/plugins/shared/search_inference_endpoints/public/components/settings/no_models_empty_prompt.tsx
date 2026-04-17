/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
} from '@elastic/eui';
import { MANAGEMENT_APP_ID, CLOUD_CONNECT_NAV_ID } from '@kbn/deeplinks-management/constants';
import * as i18n from '../../../common/translations';
import { INFERENCE_ENDPOINTS_APP_ID } from '../../../common/constants';
import { useKibana } from '../../hooks/use_kibana';

export const NoModelsEmptyPrompt: React.FC = () => {
  const {
    services: { cloud, application },
  } = useKibana();

  const isCloudEnabled = cloud?.isCloudEnabled ?? false;

  return (
    <EuiPageTemplate.Section
      paddingSize="none"
      data-test-subj="modelSettingsContent"
      restrictWidth={true}
      alignment="center"
      grow
    >
      <EuiEmptyPrompt
        color="plain"
        iconType="machineLearningApp"
        title={<h2>{i18n.SETTINGS_NO_MODELS_TITLE}</h2>}
        body={
          <p>
            {isCloudEnabled
              ? i18n.SETTINGS_NO_MODELS_DESCRIPTION
              : i18n.SETTINGS_NO_MODELS_NO_CLOUD_DESCRIPTION}
          </p>
        }
        data-test-subj="settings-no-models"
        actions={
          <EuiFlexGroup gutterSize="s" justifyContent="center">
            {!isCloudEnabled && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={() => application.navigateToApp(CLOUD_CONNECT_NAV_ID)}
                  data-test-subj="settings-no-models-connect-eis"
                >
                  {i18n.SETTINGS_NO_MODELS_CONNECT_EIS}
                </EuiButton>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButton
                fill={isCloudEnabled}
                onClick={() =>
                  application.navigateToApp(MANAGEMENT_APP_ID, {
                    path: `modelManagement/${INFERENCE_ENDPOINTS_APP_ID}`,
                  })
                }
                data-test-subj="settings-no-models-add-models"
              >
                {i18n.SETTINGS_NO_MODELS_ADD_MODELS}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    </EuiPageTemplate.Section>
  );
};
