/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentPackManifest } from '@kbn/content-packs-schema';
import React from 'react';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

export function ContentPackMetadata({
  manifest,
  readonly,
  onChange,
}: {
  manifest: ContentPackManifest;
  readonly?: boolean;
  onChange?: (manifest: ContentPackManifest) => void;
}) {
  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={3}>
          <EuiFieldText
            readOnly={readonly}
            prepend={'Name'}
            fullWidth
            value={manifest.name}
            isInvalid={manifest.name.length === 0}
            onChange={(e) => onChange?.({ ...manifest, name: e.target.value })}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiFieldText
            readOnly={readonly}
            prepend={'Version'}
            fullWidth
            value={manifest.version}
            onChange={(e) => onChange?.({ ...manifest, version: e.target.value })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFlexItem grow={true}>
        <EuiFieldText
          readOnly={readonly}
          prepend={'Description'}
          fullWidth
          value={manifest.description}
          onChange={(e) => onChange?.({ ...manifest, description: e.target.value })}
        />
      </EuiFlexItem>
    </>
  );
}
