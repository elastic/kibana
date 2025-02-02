/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useEuiBackgroundColor,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { IntegrationSettings } from '../../types';
import { StepContentWrapper } from '../step_content_wrapper';
import { PackageCardPreview } from './package_card_preview';
import { useActions } from '../../state';
import * as i18n from './translations';

const MaxLogoSize = 1024 * 1024; // One megabyte

const useLayoutStyles = () => {
  const { euiTheme } = useEuiTheme();
  const subduedBgCss = useEuiBackgroundColor('subdued');
  return {
    left: css`
      padding: ${euiTheme.size.l};
    }
  `,
    right: css`
      padding: ${euiTheme.size.l};
      background: ${subduedBgCss};
      width: 45%;
    `,
  };
};

interface IntegrationStepProps {
  integrationSettings: IntegrationSettings | undefined;
}

export const IntegrationStep = React.memo<IntegrationStepProps>(({ integrationSettings }) => {
  const styles = useLayoutStyles();
  const { setIntegrationSettings, completeStep } = useActions();
  const [logoError, setLogoError] = React.useState<string>();

  const setIntegrationValues = useCallback(
    (settings: Partial<IntegrationSettings>) =>
      setIntegrationSettings({ ...integrationSettings, ...settings }),
    [integrationSettings, setIntegrationSettings]
  );

  const onChange = useMemo(() => {
    return {
      title: (e: React.ChangeEvent<HTMLInputElement>) =>
        setIntegrationValues({ title: e.target.value }),
      description: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setIntegrationValues({ description: e.target.value }),
      logo: (files: FileList | null) => {
        setLogoError(undefined);
        const logoFile = files?.[0];
        if (!logoFile) {
          setIntegrationValues({ logo: undefined });
          return;
        }
        if (logoFile.size > MaxLogoSize) {
          setLogoError(`${logoFile.name} is too large, maximum size is 1Mb.`);
          return;
        }
        logoFile
          .arrayBuffer()
          .then((fileBuffer) => {
            const encodedLogo = window.btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
            setIntegrationValues({ logo: encodedLogo });
          })
          .catch((e) => {
            setLogoError(i18n.LOGO_ERROR);
          });
      },
    };
  }, [setIntegrationValues]);

  return (
    <StepContentWrapper title={i18n.TITLE} subtitle={i18n.DESCRIPTION}>
      <EuiPanel paddingSize="none" hasShadow={false} hasBorder data-test-subj="integrationStep">
        <EuiFlexGroup direction="row" gutterSize="none">
          <EuiFlexItem css={styles.left}>
            <EuiForm
              component="form"
              fullWidth
              onSubmit={(e) => {
                e.preventDefault();
                completeStep();
              }}
            >
              <EuiFormRow label={i18n.TITLE_LABEL}>
                <EuiFieldText
                  name="title"
                  value={integrationSettings?.title ?? ''}
                  onChange={onChange.title}
                  data-test-subj="integrationTitleInput"
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.DESCRIPTION_LABEL}>
                <EuiTextArea
                  name="description"
                  value={integrationSettings?.description ?? ''}
                  onChange={onChange.description}
                  data-test-subj="integrationDescriptionInput"
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.LOGO_LABEL}>
                <>
                  <EuiFilePicker
                    id="logsSampleFilePicker"
                    initialPromptText={i18n.LOGO_DESCRIPTION}
                    onChange={onChange.logo}
                    display="large"
                    aria-label="Upload an svg logo image"
                    accept="image/svg+xml"
                    isInvalid={logoError != null}
                    data-test-subj="integrationLogoFilePicker"
                  />
                  <EuiSpacer size="xs" />
                  {logoError && (
                    <EuiText color="danger" size="xs">
                      {logoError}
                    </EuiText>
                  )}
                </>
              </EuiFormRow>
            </EuiForm>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={styles.right}>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem grow={false}>
                <PackageCardPreview integrationSettings={integrationSettings} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </StepContentWrapper>
  );
});
IntegrationStep.displayName = 'IntegrationStep';
