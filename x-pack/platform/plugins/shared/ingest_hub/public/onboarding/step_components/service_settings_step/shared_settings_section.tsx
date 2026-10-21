/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFieldText,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { MAX_DESCRIPTION_LENGTH, MAX_INTEGRATION_NAME_LENGTH } from './integration_settings';

interface SharedSettingsSectionProps {
  integrationName: string;
  onIntegrationNameChange: (name: string) => void;
  integrationNameError?: string;
  description: string;
  onDescriptionChange: (description: string) => void;
  descriptionError?: string;
  /** Policies are already deployed: the name and description no longer apply to them. */
  isLocked: boolean;
}

const LOCKED_TOOLTIP = i18n.translate('xpack.ingestHub.sharedSettings.lockedTooltip', {
  defaultMessage:
    'Cannot be changed after services have been deployed. To use a different value, start a new session.',
});

/**
 * Settings that apply to every policy the deploy creates, shown above the service list.
 * ECF-only selections create no package policies, so the parent does not render this section.
 */
export function SharedSettingsSection({
  integrationName,
  onIntegrationNameChange,
  integrationNameError,
  description,
  onDescriptionChange,
  descriptionError,
  isLocked,
}: SharedSettingsSectionProps) {
  // Show errors once the field was edited, so the prefilled form does not open with errors.
  const [nameTouched, setNameTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);

  const withLockTooltip = (field: React.ReactElement) =>
    isLocked ? (
      // block display keeps the full-width field full width; the anchor takes the hover because a
      // disabled input has pointer-events:none.
      <EuiToolTip content={LOCKED_TOOLTIP} display="block" anchorProps={{ tabIndex: 0 }}>
        {field}
      </EuiToolTip>
    ) : (
      field
    );

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m" data-test-subj="sharedSettingsSection">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.ingestHub.sharedSettings.title', {
            defaultMessage: 'Shared settings',
          })}{' '}
          <EuiIconTip
            type="info"
            color="subdued"
            content={i18n.translate('xpack.ingestHub.sharedSettings.titleTooltip', {
              defaultMessage: 'Applies to all selected services',
            })}
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.ingestHub.sharedSettings.name.label', {
          defaultMessage: 'Integration name',
        })}
        isInvalid={nameTouched && !!integrationNameError}
        error={integrationNameError}
      >
        {withLockTooltip(
          <EuiFieldText
            fullWidth
            value={integrationName}
            maxLength={MAX_INTEGRATION_NAME_LENGTH + 1}
            onChange={(e) => {
              setNameTouched(true);
              onIntegrationNameChange(e.target.value);
            }}
            onBlur={() => setNameTouched(true)}
            isInvalid={nameTouched && !!integrationNameError}
            disabled={isLocked}
            data-test-subj="sharedSettingsIntegrationName"
          />
        )}
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.ingestHub.sharedSettings.description.label', {
          defaultMessage: 'Description',
        })}
        labelAppend={
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.ingestHub.sharedSettings.description.optional', {
              defaultMessage: 'Optional',
            })}
          </EuiText>
        }
        isInvalid={descriptionTouched && !!descriptionError}
        error={descriptionError}
      >
        {withLockTooltip(
          <EuiTextArea
            fullWidth
            rows={2}
            value={description}
            maxLength={MAX_DESCRIPTION_LENGTH + 1}
            onChange={(e) => {
              setDescriptionTouched(true);
              onDescriptionChange(e.target.value);
            }}
            onBlur={() => setDescriptionTouched(true)}
            isInvalid={descriptionTouched && !!descriptionError}
            disabled={isLocked}
            data-test-subj="sharedSettingsDescription"
          />
        )}
      </EuiFormRow>
    </EuiPanel>
  );
}
