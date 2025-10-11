/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiMarkdownEditor, EuiTitle, EuiSpacer } from '@elastic/eui';
import type { Feature } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { ConditionPanel } from '../../shared';

export const FeatureDetailExpanded = ({ feature }: { feature: Feature }) => {
  const [value, setValue] = useState(feature.description);

  return (
    <div>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.streams.streamDetailView.featureDetailExpanded.description', {
            defaultMessage: 'Description',
          })}
        </h3>
      </EuiTitle>
      <EuiMarkdownEditor
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.featureDetailExpanded.markdownEditorAriaLabel',
          {
            defaultMessage: 'Feature description markdown editor',
          }
        )}
        value={value}
        onChange={setValue}
        height={400}
        readOnly={false}
        initialViewMode="viewing"
      />
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.streams.streamDetailView.featureDetailExpanded.filter', {
            defaultMessage: 'Filter',
          })}
        </h3>
      </EuiTitle>
      <ConditionPanel condition={feature.filter} />
    </div>
  );
};
