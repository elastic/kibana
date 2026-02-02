/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { ProcessorFieldSelector } from '../processor_field_selector';

export const SourceIpField = () => {
  return (
    <ProcessorFieldSelector
      fieldKey="source_ip"
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionSourceIpLabel',
        { defaultMessage: 'Source IP field' }
      )}
    />
  );
};

export const DestinationIpField = () => {
  return (
    <ProcessorFieldSelector
      fieldKey="destination_ip"
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionDestinationIpLabel',
        { defaultMessage: 'Destination IP field' }
      )}
    />
  );
};

export const NetworkDirectionTargetField = () => {
  return (
    <ProcessorFieldSelector
      fieldKey="target_field"
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionTargetFieldLabel',
        { defaultMessage: 'Target field' }
      )}
    />
  );
};
