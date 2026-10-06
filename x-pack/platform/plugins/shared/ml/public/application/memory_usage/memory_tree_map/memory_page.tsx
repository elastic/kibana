/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { JobMemoryTreeMap } from './tree_map';

export const MemoryPage: FC = () => {
  return (
    <>
      <EuiSpacer size="s" />
      <KbnInfoCallout
        title={
          <FormattedMessage
            id="xpack.ml.memoryUsage.treeMap.infoCallout"
            defaultMessage="Memory usage for active machine learning jobs and trained models."
          />
        }
      />
      <JobMemoryTreeMap />
    </>
  );
};
