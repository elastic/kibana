/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface MappingEditorHeaderProps {
  isAddFieldVisible: boolean;
  onAddField: () => void;
  fieldSearch: string;
  onFieldSearchChange: (next: string) => void;
}

export const MappingEditorHeader = ({
  isAddFieldVisible,
  onAddField,
  fieldSearch,
  onFieldSearchChange,
}: MappingEditorHeaderProps) => {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h4>
            {i18n.translate('xpack.dataFederation.mappingEditor.fieldsTitle', {
              defaultMessage: 'Mapped fields',
            })}
          </h4>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.dataFederation.mappingEditor.timestampRecommendation', {
            defaultMessage:
              'Mapping your timestamp field and renaming it to @timestamp is recommended.',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false} style={{ alignSelf: 'flex-end' }}>
            <div
              style={{
                width: 'fit-content',
                visibility: isAddFieldVisible ? 'visible' : 'hidden',
              }}
              aria-hidden={!isAddFieldVisible}
            >
              <EuiButton
                iconType="plusCircle"
                size="s"
                color="primary"
                onClick={onAddField}
                data-test-subj="dataFederationMappingEditorAddField"
              >
                {i18n.translate('xpack.dataFederation.mappingEditor.addFieldButton', {
                  defaultMessage: 'Add field',
                })}
              </EuiButton>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div style={{ width: 320 }}>
              <EuiFieldSearch
                placeholder={i18n.translate('xpack.dataFederation.mappingEditor.searchFields', {
                  defaultMessage: 'Search fields',
                })}
                aria-label={i18n.translate('xpack.dataFederation.mappingEditor.searchFields', {
                  defaultMessage: 'Search fields',
                })}
                value={fieldSearch}
                onChange={(event) => onFieldSearchChange(event.target.value)}
                fullWidth
                data-test-subj="dataFederationMappingEditorSearchFields"
              />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
