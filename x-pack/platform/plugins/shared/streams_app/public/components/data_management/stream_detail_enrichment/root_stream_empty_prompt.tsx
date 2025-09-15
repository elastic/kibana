/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AssetImage } from '../../asset_image';

export const RootStreamEmptyPrompt = () => {
  return (
    <EuiEmptyPrompt
      titleSize="xs"
      icon={<AssetImage type="processorsCannotBeAddedToRootStreams" />}
      title={
        <h2>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.rootStreamEmptyPrompt.title',
            { defaultMessage: 'Processing data is not allowed for root streams.' }
          )}
        </h2>
      }
      body={
        <p>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.rootStreamEmptyPrompt.body',
            {
              defaultMessage:
                'Root streams are selectively immutable and cannot be enriched with processors. To enrich data, reroute a new child stream and add processors to it.',
            }
          )}
        </p>
      }
    />
  );
};
