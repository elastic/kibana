/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { get } from 'lodash';
import { css } from '@emotion/react';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import type { Phase } from '../../../../../../../common/types';
import { ToggleField, useFormData } from '../../../../../../shared_imports';
import { i18nTexts } from '../../../i18n_texts';
import type { FormInternal } from '../../../types';
import { UseField, useFormErrorsContext, usePhaseTimings } from '../../../form';
import { MinAgeField } from '../shared_fields';

const styles = {
  phaseRequiredBadge: css`
    max-width: 150px;
  `,
  phaseTitle: css`
    min-width: 100px;
  `,
};

interface Props {
  phase: Phase;
}

export const PhaseTitle: FunctionComponent<Props> = ({ phase }) => {
  const enabledPath = `_meta.${phase}.enabled`;
  const [formData] = useFormData<FormInternal>({
    watch: [enabledPath],
  });

  const isHotPhase = phase === 'hot';
  const isDeletePhase = phase === 'delete';
  const { setDeletePhaseEnabled } = usePhaseTimings();
  // hot phase is always enabled
  const enabled = get(formData, enabledPath) || isHotPhase;

  const { errors } = useFormErrorsContext();
  const hasErrors = Object.keys(errors[phase]).length > 0;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="spaceBetween">
      <EuiFlexItem grow={true}>
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
          {!isHotPhase && !isDeletePhase && (
            <EuiFlexItem grow={false}>
              <UseField
                path={enabledPath}
                component={ToggleField}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': `enablePhaseSwitch-${phase}`,
                    showLabel: false,
                  },
                }}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false} css={styles.phaseTitle}>
            <EuiTitle size="s">
              <h2>{i18nTexts.editPolicy.titles[phase]}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {isHotPhase && (
            <EuiFlexItem grow={false}>
              <EuiBadge css={styles.phaseRequiredBadge}>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.phaseTitle.requiredBadge"
                  defaultMessage="Required"
                />
              </EuiBadge>
            </EuiFlexItem>
          )}
          {isDeletePhase && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={() => setDeletePhaseEnabled(false)}
                data-test-subj={'disableDeletePhaseButton'}
              >
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.removeDeletePhaseButtonLabel"
                  defaultMessage="Remove"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          {hasErrors && (
            <EuiFlexItem grow={false} data-test-subj={`phaseErrorIndicator-${phase}`}>
              <EuiIconTip
                type="warning"
                color="danger"
                content={
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.phaseErrorIcon.tooltipDescription"
                    defaultMessage="This phase contains errors."
                  />
                }
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {!isHotPhase && enabled && (
        <EuiFlexItem grow={false}>
          <MinAgeField phase={phase} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
