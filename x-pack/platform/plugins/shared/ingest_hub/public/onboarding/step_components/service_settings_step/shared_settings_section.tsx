/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  euiCanAnimate,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { GlobalRegionField } from './global_region_field';
import { SharedAdvancedSettings } from './shared_advanced_settings';
import { MAX_DESCRIPTION_LENGTH, MAX_INTEGRATION_NAME_LENGTH } from './integration_settings';

const ADVANCED_ANIMATION_MS = 300;

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
  namespace: string;
  onNamespaceChange: (namespace: string) => void;
  /** Validation error of the namespace; the advanced section stays open while there is one. */
  namespaceError?: string;
  /** Whether services are already deployed, which changes what a new namespace means. */
  hasDeployedServices?: boolean;
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
  namespace,
  onNamespaceChange,
  namespaceError,
  hasDeployedServices = false,
}: SharedSettingsSectionProps) {
  // Show errors once the field was edited, so the prefilled form does not open with errors.
  const [nameTouched, setNameTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  // Collapsed by default. It cannot be collapsed over an error, which would hide why Next is off.
  const [advancedToggled, setAdvancedToggled] = useState(false);
  const isAdvancedOpen = advancedToggled || !!namespaceError;
  const advancedId = useGeneratedHtmlId({ prefix: 'sharedAdvancedSettings' });
  const { euiTheme } = useEuiTheme();

  // Fully rounded, unlike EuiButton's own radius.
  const toggleStyle = css`
    && {
      border-radius: ${euiTheme.size.xl};
    }
  `;
  const chevronStyle = css`
    ${euiCanAnimate} {
      transition: transform ${euiTheme.animation.fast} ease-in-out;
    }
    transform: rotate(${isAdvancedOpen ? '90deg' : '0deg'});
  `;
  // The region is always mounted so it can animate. It grows from zero height, its content fades in,
  // and it stays out of the tab order and the accessibility tree while collapsed.
  const collapsibleStyle = css`
    display: grid;
    grid-template-rows: 0fr;
    visibility: hidden;
    ${euiCanAnimate} {
      transition: grid-template-rows ${ADVANCED_ANIMATION_MS}ms ease-in-out,
        visibility 0s linear ${ADVANCED_ANIMATION_MS}ms;
    }
    &[data-open='true'] {
      grid-template-rows: 1fr;
      visibility: visible;
      ${euiCanAnimate} {
        transition: grid-template-rows ${ADVANCED_ANIMATION_MS}ms ease-in-out;
      }
    }
  `;
  const collapsibleInnerStyle = css`
    min-height: 0;
    overflow: hidden;
    opacity: 0;
    /* Room for focus rings, which the clipping would otherwise cut off. */
    padding: ${euiTheme.size.xs};
    margin: -${euiTheme.size.xs};
    ${euiCanAnimate} {
      transition: opacity ${ADVANCED_ANIMATION_MS}ms ease-in-out;
    }
    [data-open='true'] > & {
      opacity: 1;
    }
  `;

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m" data-test-subj="sharedSettingsSection">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.ingestHub.integrationSettings.section.title', {
                defaultMessage: 'Integration settings',
              })}{' '}
              <EuiIconTip
                type="info"
                color="subdued"
                content={i18n.translate(
                  'xpack.ingestHub.integrationSettings.section.titleTooltip',
                  {
                    defaultMessage: 'Applies to all selected services',
                  }
                )}
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            color="text"
            iconType="gear"
            css={toggleStyle}
            onClick={() => setAdvancedToggled((open) => !open)}
            aria-expanded={isAdvancedOpen}
            aria-controls={advancedId}
            data-test-subj="sharedSettingsAdvancedToggle"
          >
            {i18n.translate('xpack.ingestHub.integrationSettings.section.advancedOptions', {
              defaultMessage: 'Advanced options',
            })}{' '}
            <EuiIcon type="chevronSingleRight" size="s" aria-hidden css={chevronStyle} />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={2} gutterSize="l">
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            display="rowCompressed"
            label={i18n.translate('xpack.ingestHub.integrationSettings.section.name.label', {
              defaultMessage: 'Integration name',
            })}
            isInvalid={nameTouched && !!integrationNameError}
            error={integrationNameError}
          >
            <EuiFieldText
              fullWidth
              compressed
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
            display="rowCompressed"
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
              compressed
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
      <div
        id={advancedId}
        css={collapsibleStyle}
        data-open={isAdvancedOpen}
        data-test-subj="sharedSettingsAdvancedRegion"
      >
        <div css={collapsibleInnerStyle}>
          <EuiHorizontalRule margin="m" />
          <SharedAdvancedSettings
            namespace={namespace}
            onNamespaceChange={onNamespaceChange}
            hasDeployedServices={hasDeployedServices}
          />
        </div>
      </div>
    </EuiPanel>
  );
}
