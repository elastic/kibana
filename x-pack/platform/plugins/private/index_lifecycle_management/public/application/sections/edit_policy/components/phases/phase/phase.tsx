/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { css as cssClassName } from '@emotion/css';
import { css } from '@emotion/react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiAccordion,
  EuiSpacer,
  EuiTimelineItem,
  EuiSplitPanel,
  EuiHorizontalRule,
  useEuiTheme,
} from '@elastic/eui';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Phase as PhaseType } from '../../../../../../../common/types';
import { useFormData } from '../../../../../../shared_imports';
import { i18nTexts } from '../../../i18n_texts';
import type { FormInternal } from '../../../types';
import { PhaseIcon } from '../../phase_icon';
import { PhaseFooter } from '../../phase_footer';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    settingsAccordionButtonClassName: cssClassName`
      color: ${euiTheme.colors.primary};
      padding-top: ${euiTheme.size.s};
      padding-bottom: ${euiTheme.size.s};
    `,
    halfWidth: css`
      max-width: 50%;
    `,
  };
};

import { PhaseTitle } from './phase_title';

interface Props {
  phase: PhaseType;
  /**
   * Settings that should always be visible on the phase when it is enabled.
   */
  topLevelSettings?: React.ReactNode;
  children?: React.ReactNode;
}

export const Phase: FunctionComponent<Props> = ({ children, topLevelSettings, phase }) => {
  const styles = useStyles();
  const enabledPath = `_meta.${phase}.enabled`;
  const [formData] = useFormData<FormInternal>({
    watch: [enabledPath],
  });

  const isHotPhase = phase === 'hot';
  const isDeletePhase = phase === 'delete';
  // hot phase is always enabled
  const enabled = get(formData, enabledPath) || isHotPhase;

  // delete phase is hidden when disabled
  if (isDeletePhase && !enabled) {
    return null;
  }

  return (
    <EuiTimelineItem
      icon={<PhaseIcon enabled={enabled} phase={phase} />}
      verticalAlign="top"
      data-test-subj={`${phase}-phase`}
    >
      <EuiSplitPanel.Outer color="transparent" hasBorder grow>
        <EuiSplitPanel.Inner color={enabled ? 'transparent' : 'subdued'}>
          <PhaseTitle phase={phase} />
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner>
          <EuiText color="subdued" size="s" css={styles.halfWidth}>
            {i18nTexts.editPolicy.descriptions[phase]}
          </EuiText>

          {enabled && (
            <>
              {!!topLevelSettings ? (
                <>
                  <EuiSpacer />
                  {topLevelSettings}
                </>
              ) : (
                <EuiSpacer size="m" />
              )}

              {children ? (
                <EuiAccordion
                  id={`${phase}-settingsSwitch`}
                  buttonContent={
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.editPolicy.phaseSettings.buttonLabel"
                      defaultMessage="Advanced settings"
                    />
                  }
                  buttonClassName={styles.settingsAccordionButtonClassName}
                  extraAction={!isDeletePhase && <PhaseFooter phase={phase} />}
                >
                  <EuiSpacer />
                  {children}
                </EuiAccordion>
              ) : (
                !isDeletePhase && (
                  <EuiFlexGroup justifyContent="flexEnd">
                    <EuiFlexItem grow={false}>
                      <PhaseFooter phase={phase} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )
              )}
            </>
          )}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </EuiTimelineItem>
  );
};
