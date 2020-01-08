/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCodeBlock, EuiCallOut } from '@elastic/eui';
import { Template } from '../../../../../../../common/types';

interface Props {
  templateDetails: Template;
}

export const TabMappings: React.FunctionComponent<Props> = ({ templateDetails }) => {
  const { mappings } = templateDetails;

  if (mappings && Object.keys(mappings).length) {
    return (
      <div data-test-subj="mappingsTab">
        <EuiCodeBlock lang="json">{JSON.stringify(mappings, null, 2)}</EuiCodeBlock>
      </div>
    );
  }

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.idxMgmt.templateDetails.mappingsTab.noMappingsTitle"
          defaultMessage="No mappings defined."
        />
      }
      iconType="pin"
      data-test-subj="noMappingsCallout"
    />
  );
};
