/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { useAssistantContext } from '../../../assistant_context';
import { ContextEditor } from '../../../data_anonymization_editor/context_editor';
import type { BatchUpdateListItem } from '../../../data_anonymization_editor/context_editor/types';
import { updateDefaults } from '../../../data_anonymization_editor/helpers';
import { AllowedStat } from '../../../data_anonymization_editor/stats/allowed_stat';
import { AnonymizedStat } from '../../../data_anonymization_editor/stats/anonymized_stat';
import { CANCEL, SAVE } from '../anonymization_settings_modal/translations';
import * as i18n from './translations';

const StatFlexItem = styled(EuiFlexItem)`
  margin-right: ${({ theme }) => theme.eui.euiSizeL};
`;

interface Props {
  closeModal?: () => void;
}

const AnonymizationSettingsComponent: React.FC<Props> = ({ closeModal }) => {
  const {
    baseAllow,
    baseAllowReplacement,
    defaultAllow,
    defaultAllowReplacement,
    setDefaultAllow,
    setDefaultAllowReplacement,
  } = useAssistantContext();

  // Local state for default allow and default allow replacement to allow for intermediate changes
  const [localDefaultAllow, setLocalDefaultAllow] = useState<string[]>(defaultAllow);
  const [localDefaultAllowReplacement, setLocalDefaultAllowReplacement] =
    useState<string[]>(defaultAllowReplacement);

  const onListUpdated = useCallback(
    (updates: BatchUpdateListItem[]) => {
      updateDefaults({
        defaultAllow: localDefaultAllow,
        defaultAllowReplacement: localDefaultAllowReplacement,
        setDefaultAllow: setLocalDefaultAllow,
        setDefaultAllowReplacement: setLocalDefaultAllowReplacement,
        updates,
      });
    },
    [localDefaultAllow, localDefaultAllowReplacement]
  );

  const onReset = useCallback(() => {
    setLocalDefaultAllow(baseAllow);
    setLocalDefaultAllowReplacement(baseAllowReplacement);
  }, [baseAllow, baseAllowReplacement]);

  const onSave = useCallback(() => {
    setDefaultAllow(localDefaultAllow);
    setDefaultAllowReplacement(localDefaultAllowReplacement);
    closeModal?.();
  }, [
    closeModal,
    localDefaultAllow,
    localDefaultAllowReplacement,
    setDefaultAllow,
    setDefaultAllowReplacement,
  ]);

  const anonymized: number = useMemo(() => {
    const allowSet = new Set(localDefaultAllow);

    return localDefaultAllowReplacement.reduce(
      (acc, field) => (allowSet.has(field) ? acc + 1 : acc),
      0
    );
  }, [localDefaultAllow, localDefaultAllowReplacement]);

  return (
    <>
      <EuiCallOut
        data-test-subj="anonymizationSettingsCallout"
        iconType="eyeClosed"
        size="s"
        title={i18n.CALLOUT_TITLE}
      >
        <p>{i18n.CALLOUT_PARAGRAPH1}</p>
        <EuiButton data-test-subj="reset" onClick={onReset} size="s">
          {i18n.RESET}
        </EuiButton>
      </EuiCallOut>

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="center" data-test-subj="summary" gutterSize="none">
        <StatFlexItem grow={false}>
          <AllowedStat allowed={localDefaultAllow.length} total={localDefaultAllow.length} />
        </StatFlexItem>

        <StatFlexItem grow={false}>
          <AnonymizedStat anonymized={anonymized} isDataAnonymizable={true} />
        </StatFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <ContextEditor
        allow={localDefaultAllow}
        allowReplacement={localDefaultAllowReplacement}
        onListUpdated={onListUpdated}
        rawData={null}
      />

      <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="flexEnd">
        {closeModal != null && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="cancel" onClick={closeModal}>
              {CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <EuiButton fill data-test-subj="save" onClick={onSave} size="s">
            {SAVE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

AnonymizationSettingsComponent.displayName = 'AnonymizationSettingsComponent';

export const AnonymizationSettings = React.memo(AnonymizationSettingsComponent);
