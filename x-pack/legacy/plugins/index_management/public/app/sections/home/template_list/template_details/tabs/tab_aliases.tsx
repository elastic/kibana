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

export const TabAliases: React.FunctionComponent<Props> = ({ templateDetails }) => {
  const { aliases } = templateDetails;

  if (aliases && Object.keys(aliases).length) {
    return (
      <div data-test-subj="aliasesTab">
        <EuiCodeBlock lang="json">{JSON.stringify(aliases, null, 2)}</EuiCodeBlock>
      </div>
    );
  }

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.idxMgmt.templateDetails.aliasesTab.noAliasesTitle"
          defaultMessage="No aliases defined."
        />
      }
      iconType="pin"
      data-test-subj="noAliasesCallout"
    />
  );
};
