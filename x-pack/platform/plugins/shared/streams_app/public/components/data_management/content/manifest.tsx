/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentPackManifest } from '@kbn/content-packs-schema';
import React from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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
          <EuiFormRow label="Name" fullWidth>
            <EuiFieldText
              name="name"
              readOnly={readonly}
              fullWidth
              value={manifest.name}
              isInvalid={manifest.name.length === 0}
              onChange={(e) => onChange?.({ ...manifest, name: e.target.value })}
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiFormRow label="Version" fullWidth>
            <EuiFieldText
              readOnly={readonly}
              name="version"
              fullWidth
              value={manifest.version}
              onChange={(e) => onChange?.({ ...manifest, version: e.target.value })}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexItem grow={true}>
        <EuiFormRow
          label="Description"
          labelAppend={
            !readonly && (
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.streams.contentPack.description.optionalLabel', {
                  defaultMessage: 'Optional',
                })}
              </EuiText>
            )
          }
          fullWidth
        >
          <EuiFieldText
            name="description"
            readOnly={readonly}
            fullWidth
            value={manifest.description}
            onChange={(e) => onChange?.({ ...manifest, description: e.target.value })}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </>
  );
}
