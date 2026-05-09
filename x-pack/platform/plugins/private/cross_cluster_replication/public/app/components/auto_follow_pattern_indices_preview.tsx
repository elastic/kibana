/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getPreviewIndicesFromAutoFollowPattern } from '../services/auto_follow_pattern';

interface Props {
  prefix?: string;
  suffix?: string;
  leaderIndexPatterns: string[];
}

export const AutoFollowPatternIndicesPreview: FC<Props> = ({
  prefix = '',
  suffix = '',
  leaderIndexPatterns,
}) => {
  const { indicesPreview } = getPreviewIndicesFromAutoFollowPattern({
    prefix,
    suffix,
    leaderIndexPatterns,
  });

  const title = i18n.translate(
    'xpack.crossClusterReplication.autoFollowPatternForm.indicesPreviewTitle',
    {
      defaultMessage: 'Index name examples',
    }
  );

  return (
    <EuiCallOut title={title} iconType="mapping" data-test-subj="autoFollowPatternIndicesPreview">
      <FormattedMessage
        id="xpack.crossClusterReplication.autoFollowPatternForm.indicesPreviewDescription"
        defaultMessage="The above settings will generate index names that look like this:"
      />
      <ul>
        {indicesPreview.map(
          ({ followPattern: { prefix: fpPrefix, suffix: fpSuffix, template } }, i) => (
            <li key={i} data-test-subj="indexPreview">
              {fpPrefix}
              <strong>{template}</strong>
              {fpSuffix}
            </li>
          )
        )}
      </ul>
    </EuiCallOut>
  );
};
