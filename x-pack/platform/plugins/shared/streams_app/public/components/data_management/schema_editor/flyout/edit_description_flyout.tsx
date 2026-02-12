/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
  EuiFlyout,
  useGeneratedHtmlId,
  EuiTextArea,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SchemaField } from '../types';
import { FieldStatusBadge } from '../field_status';

export interface EditDescriptionFlyoutProps {
  field: SchemaField;
  onClose: () => void;
  onSave: (field: SchemaField) => void;
}

export const EditDescriptionFlyout = ({
  field,
  onClose,
  onSave,
}: EditDescriptionFlyoutProps) => {
  const [description, setDescription] = useState(field.description ?? '');
  const flyoutId = useGeneratedHtmlId({ prefix: 'streams-edit-description' });

  const handleSave = () => {
    onSave({
      ...field,
      description: description || undefined,
    } as SchemaField);
    onClose();
  };

  const isInherited = field.status === 'inherited';

  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby={flyoutId} maxWidth={500}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.streams.editDescriptionFlyout.title', {
              defaultMessage: 'Edit description',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{field.name}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <FieldStatusBadge status={field.status} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          {isInherited && (
            <EuiFlexItem grow={false}>
              <EuiCallOut
                color="primary"
                iconType="iInCircle"
                title={i18n.translate(
                  'xpack.streams.editDescriptionFlyout.inheritedFieldCalloutTitle',
                  {
                    defaultMessage: 'Inherited field override',
                  }
                )}
              >
                <FormattedMessage
                  id="xpack.streams.editDescriptionFlyout.inheritedFieldCalloutMessage"
                  defaultMessage="Setting a description on an inherited field will create an override in this stream. The field's type and format will remain inherited from the parent."
                />
              </EuiCallOut>
            </EuiFlexItem>
          )}

          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <span>
                {i18n.translate('xpack.streams.editDescriptionFlyout.descriptionLabel', {
                  defaultMessage: 'Description',
                })}
              </span>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiTextArea
              data-test-subj="streamsAppEditDescriptionFlyoutTextArea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={i18n.translate(
                'xpack.streams.editDescriptionFlyout.descriptionPlaceholder',
                {
                  defaultMessage: 'Add a description for this field...',
                }
              )}
              rows={5}
              fullWidth
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty
            data-test-subj="streamsAppEditDescriptionFlyoutCancelButton"
            iconType="cross"
            onClick={onClose}
            flush="left"
          >
            {i18n.translate('xpack.streams.editDescriptionFlyout.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            data-test-subj="streamsAppEditDescriptionFlyoutSaveButton"
            onClick={handleSave}
          >
            {i18n.translate('xpack.streams.editDescriptionFlyout.saveButtonLabel', {
              defaultMessage: 'Save description',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
