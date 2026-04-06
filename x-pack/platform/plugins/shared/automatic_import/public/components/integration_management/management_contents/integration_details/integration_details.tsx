/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { PackageCardPreview } from './package_card_preview';
import { FormStyledLabel } from '../../../../common/components/form_styled_label';
import { MAX_LOGO_SIZE_BYTES } from '../../forms/constants';
import * as i18n from './translations';

const useLayoutStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    leftPanel: css`
      width: 100%;
      max-width: 600px;

      @media (max-width: ${euiTheme.breakpoint.m}px) {
        max-width: 100%;
      }
    `,
    formRowSpacing: css`
      .euiFormRow {
        margin-block: 0;

        &::after {
          content: '';
          display: block;
          height: ${euiTheme.size.base};
        }

        &:has(.euiFormRow__text)::after {
          display: none;
        }
      }

      // margin override to smaller spacing between form rows
      .euiFormRow + .euiFormRow {
        margin-block-start: ${euiTheme.size.xs};
      }
    `,
    container: css`
      width: 100%;
    `,
    formField: css`
      background: ${euiTheme.colors.backgroundBaseSubdued};
    `,
  };
};

const processLogoFile = async (
  files: FileList | null,
  field: FieldHook<string | undefined>,
  setError: (error: string | undefined) => void
) => {
  setError(undefined);
  const file = files?.[0];

  if (!file) {
    field.setValue(undefined);
    return;
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    setError(i18n.getLogoTooLargeError(file.name));
    return;
  }

  if (!file.name.endsWith('.svg') || !file.type.startsWith('image/svg+xml')) {
    setError(i18n.LOGO_INVALID_FORMAT);
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    const base64 = window.btoa(String.fromCharCode(...new Uint8Array(buffer)));
    field.setValue(base64);
  } catch {
    setError(i18n.LOGO_ERROR);
  }
};

export const IntegrationDetails = React.memo(() => {
  const styles = useLayoutStyles();
  const [logoError, setLogoError] = useState<string>();

  const initialSVGPickerText = (
    <EuiText size="s">
      <strong>{i18n.LOGO_DESCRIPTION_PART_1}</strong> {i18n.LOGO_DESCRIPTION_PART_2}
    </EuiText>
  );

  return (
    <EuiFlexGroup direction="column" alignItems="center">
      <EuiFlexItem css={styles.container}>
        <EuiFlexGroup direction="row" justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              {i18n.DESCRIPTION}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiPanel paddingSize="none" hasShadow={false}>
          <EuiFlexGroup direction="row" gutterSize="m">
            <EuiFlexItem css={styles.leftPanel}>
              <EuiPanel
                paddingSize="l"
                hasBorder
                hasShadow={false}
                borderRadius="m"
                css={styles.formRowSpacing}
              >
                <UseField path="title">
                  {(field) => (
                    <EuiFormRow
                      label={<FormStyledLabel text={i18n.TITLE_LABEL} />}
                      isInvalid={field.errors.length > 0}
                      error={field.errors.map((e) => e.message)}
                      fullWidth
                    >
                      <EuiFieldText
                        value={field.value as string}
                        onChange={(e) => field.setValue(e.target.value)}
                        isInvalid={field.errors.length > 0}
                        fullWidth
                        css={styles.formField}
                        data-test-subj="integrationTitleInput"
                      />
                    </EuiFormRow>
                  )}
                </UseField>

                <UseField path="description">
                  {(field) => (
                    <EuiFormRow
                      label={<FormStyledLabel text={i18n.DESCRIPTION_LABEL} />}
                      isInvalid={field.errors.length > 0}
                      error={field.errors.map((e) => e.message)}
                      fullWidth
                    >
                      <EuiFieldText
                        value={field.value as string}
                        onChange={(e) => field.setValue(e.target.value)}
                        fullWidth
                        isInvalid={field.errors.length > 0}
                        css={styles.formField}
                        data-test-subj="integrationDescriptionInput"
                      />
                    </EuiFormRow>
                  )}
                </UseField>

                <UseField<string | undefined> path="logo">
                  {(field) => (
                    <EuiFormRow
                      label={<FormStyledLabel text={i18n.LOGO_LABEL} />}
                      fullWidth
                      isInvalid={!!logoError}
                      error={logoError}
                    >
                      <EuiFilePicker
                        id="logoFilePicker"
                        initialPromptText={initialSVGPickerText}
                        display="large"
                        fullWidth
                        aria-label="Upload an SVG logo image"
                        accept="image/svg+xml"
                        onChange={(files) => processLogoFile(files, field, setLogoError)}
                        isInvalid={!!logoError}
                        css={styles.formField}
                        data-test-subj="integrationLogoFilePicker"
                      />
                    </EuiFormRow>
                  )}
                </UseField>
              </EuiPanel>
            </EuiFlexItem>

            <PackageCardPreview />
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

IntegrationDetails.displayName = 'IntegrationDetails';
