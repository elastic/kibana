/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCodeBlock } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';

import type { Aliases } from '../../../../../../common';

interface Props {
  aliases: Aliases | undefined;
}

export const TabAliases: React.FunctionComponent<Props> = ({ aliases }) => {
  if (aliases && Object.keys(aliases).length) {
    return (
      <div data-test-subj="aliasesTabContent">
        <EuiCodeBlock isCopyable={true} language="json">
          {JSON.stringify(aliases, null, 2)}
        </EuiCodeBlock>
      </div>
    );
  }

  return (
    <KbnInfoCallout
      title={
        <FormattedMessage
          id="xpack.idxMgmt.aliasesTab.noAliasesTitle"
          defaultMessage="No aliases defined."
        />
      }
      data-test-subj="noAliasesCallout"
      size="s"
    />
  );
};
