/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { GlobalRegionField } from './global_region_field';
import { MAX_DESCRIPTION_LENGTH, MAX_INTEGRATION_NAME_LENGTH } from './integration_settings';

interface SharedSettingsSectionProps {
  integrationName: string;
  onIntegrationNameChange: (name: string) => void;
  integrationNameError?: string;
  description: string;
  onDescriptionChange: (description: string) => void;
  descriptionError?: string;
  globalRegion: string;
  onGlobalRegionChange: (region: string) => void;
  /** Whether the region was edited, so the empty prefilled form does not open with an error. */
  globalRegionTouched: boolean;
  onGlobalRegionTouched: () => void;
  isGlobalRegionDisabled?: boolean;
}

/**
 * Settings that describe the onboarding instance, shown above the service list. They stay
 * editable after a deploy (only the global region is tied to what was deployed); a change reaches
 * the policies created from then on, and the saved onboarding record.
 */
export function SharedSettingsSection({
  integrationName,
  onIntegrationNameChange,
  integrationNameError,
  description,
  onDescriptionChange,
  descriptionError,
  globalRegion,
  onGlobalRegionChange,
  globalRegionTouched,
  onGlobalRegionTouched,
  isGlobalRegionDisabled = false,
}: SharedSettingsSectionProps) {
  // Show errors once the field was edited, so the prefilled form does not open with errors.
  const [nameTouched, setNameTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m" data-test-subj="sharedSettingsSection">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.ingestHub.integrationSettings.section.title', {
            defaultMessage: 'Integration settings',
          })}{' '}
          <EuiIconTip
            type="info"
            color="subdued"
            content={i18n.translate('xpack.ingestHub.integrationSettings.section.titleTooltip', {
              defaultMessage: 'Applies to all selected services',
            })}
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={2} gutterSize="l">
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.ingestHub.integrationSettings.section.name.label', {
              defaultMessage: 'Integration name',
            })}
            isInvalid={nameTouched && !!integrationNameError}
            error={integrationNameError}
          >
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
              data-test-subj="sharedSettingsIntegrationName"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <GlobalRegionField
            value={globalRegion}
            onChange={onGlobalRegionChange}
            touched={globalRegionTouched}
            onTouched={onGlobalRegionTouched}
            isDisabled={isGlobalRegionDisabled}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.ingestHub.integrationSettings.section.description.label', {
              defaultMessage: 'Description',
            })}
            labelAppend={
              <EuiText size="xs" color="subdued">
                {i18n.translate(
                  'xpack.ingestHub.integrationSettings.section.description.optional',
                  {
                    defaultMessage: 'Optional',
                  }
                )}
              </EuiText>
            }
            isInvalid={descriptionTouched && !!descriptionError}
            error={descriptionError}
          >
            <EuiFieldText
              fullWidth
              value={description}
              maxLength={MAX_DESCRIPTION_LENGTH + 1}
              onChange={(e) => {
                setDescriptionTouched(true);
                onDescriptionChange(e.target.value);
              }}
              onBlur={() => setDescriptionTouched(true)}
              isInvalid={descriptionTouched && !!descriptionError}
              data-test-subj="sharedSettingsDescription"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiPanel>
  );
}
