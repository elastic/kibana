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
      aria-live="polite"
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

export const NoProcessorsEmptyPrompt = () => {
  return (
    <EuiEmptyPrompt
      aria-live="polite"
      titleSize="xs"
      icon={<AssetImage type="extractFields" />}
      title={
        <h2>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.noProcessorsEmptyPrompt.title',
            { defaultMessage: 'Extract useful fields from your data' }
          )}
        </h2>
      }
      body={
        <p>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.noProcessorsEmptyPrompt.body',
            {
              defaultMessage:
                'Transform your data before indexing with processors. You can start from scratch or let AI generate a set of processors based on your data.',
            }
          )}
        </p>
      }
    />
  );
};
