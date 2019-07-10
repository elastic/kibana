/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCodeEditor } from '@elastic/eui';
import { Template } from '../../../../../../common/types';

interface Props {
  templateDetails: Template;
}

export const SettingsTab: React.FunctionComponent<Props> = ({ templateDetails }) => {
  const { settings } = templateDetails;
  const settingsJsonString = JSON.stringify(settings, null, 2);

  return (
    <EuiCodeEditor
      mode="json"
      theme="textmate"
      width="100%"
      height="300px"
      isReadOnly
      value={settingsJsonString}
      aria-label={i18n.translate(
        'xpack.idxMgmt.templateDetails.settingsTab.settingsCodeEditAriaLabel',
        {
          defaultMessage: 'Settings code editor',
        }
      )}
    />
  );
};
