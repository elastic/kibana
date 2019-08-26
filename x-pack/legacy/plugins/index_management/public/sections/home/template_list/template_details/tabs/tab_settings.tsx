/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCodeBlock, EuiCallOut } from '@elastic/eui';
import { Template } from '../../../../../../common/types';

interface Props {
  templateDetails: Template;
}

export const TabSettings: React.FunctionComponent<Props> = ({ templateDetails }) => {
  const { settings } = templateDetails;

  if (settings) {
    return (
      <div data-test-subj="settingsTab">
        <EuiCodeBlock lang="json">{settings}</EuiCodeBlock>
      </div>
    );
  }

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.idxMgmt.templateDetails.settingsTab.noSettingsTitle"
          defaultMessage="No settings defined."
        />
      }
      iconType="pin"
      data-test-subj="noSettingsCallout"
    ></EuiCallOut>
  );
};
