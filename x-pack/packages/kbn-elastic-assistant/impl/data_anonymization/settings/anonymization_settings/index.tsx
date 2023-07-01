/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
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
import * as i18n from './translations';

const StatFlexItem = styled(EuiFlexItem)`
  margin-right: ${({ theme }) => theme.eui.euiSizeL};
`;

interface Props {
  closeModal?: () => void;
  pageSize?: number;
}

const AnonymizationSettingsComponent: React.FC<Props> = ({ closeModal, pageSize }) => {
  const {
    baseAllow,
    baseAllowReplacement,
    defaultAllow,
    defaultAllowReplacement,
    // setDefaultAllow,
    // setDefaultAllowReplacement,
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

  // const onSave = useCallback(() => {
  //   setDefaultAllow(localDefaultAllow);
  //   setDefaultAllowReplacement(localDefaultAllowReplacement);
  //   closeModal?.();
  // }, [
  //   closeModal,
  //   localDefaultAllow,
  //   localDefaultAllowReplacement,
  //   setDefaultAllow,
  //   setDefaultAllowReplacement,
  // ]);

  const anonymized: number = useMemo(() => {
    const allowSet = new Set(localDefaultAllow);

    return localDefaultAllowReplacement.reduce(
      (acc, field) => (allowSet.has(field) ? acc + 1 : acc),
      0
    );
  }, [localDefaultAllow, localDefaultAllowReplacement]);

  return (
    <>
      <EuiTitle size={'s'}>
        <h2>{i18n.SETTINGS_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size={'xs'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>

      <EuiHorizontalRule margin={'s'} />

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
        onReset={onReset}
        rawData={null}
        pageSize={pageSize}
      />
    </>
  );
};

AnonymizationSettingsComponent.displayName = 'AnonymizationSettingsComponent';

export const AnonymizationSettings = React.memo(AnonymizationSettingsComponent);
