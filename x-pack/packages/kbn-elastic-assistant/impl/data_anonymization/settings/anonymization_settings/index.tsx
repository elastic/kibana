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
import React, { useCallback, useMemo } from 'react';
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

export interface Props {
  defaultAllow: string[];
  defaultAllowReplacement: string[];
  pageSize?: number;
  setUpdatedDefaultAllow: React.Dispatch<React.SetStateAction<string[]>>;
  setUpdatedDefaultAllowReplacement: React.Dispatch<React.SetStateAction<string[]>>;
}

const AnonymizationSettingsComponent: React.FC<Props> = ({
  defaultAllow,
  defaultAllowReplacement,
  pageSize,
  setUpdatedDefaultAllow,
  setUpdatedDefaultAllowReplacement,
}) => {
  const { baseAllow, baseAllowReplacement } = useAssistantContext();

  const onListUpdated = useCallback(
    (updates: BatchUpdateListItem[]) => {
      updateDefaults({
        defaultAllow,
        defaultAllowReplacement,
        setDefaultAllow: setUpdatedDefaultAllow,
        setDefaultAllowReplacement: setUpdatedDefaultAllowReplacement,
        updates,
      });
    },
    [
      defaultAllow,
      defaultAllowReplacement,
      setUpdatedDefaultAllow,
      setUpdatedDefaultAllowReplacement,
    ]
  );

  const onReset = useCallback(() => {
    setUpdatedDefaultAllow(baseAllow);
    setUpdatedDefaultAllowReplacement(baseAllowReplacement);
  }, [baseAllow, baseAllowReplacement, setUpdatedDefaultAllow, setUpdatedDefaultAllowReplacement]);

  const anonymized: number = useMemo(() => {
    const allowSet = new Set(defaultAllow);

    return defaultAllowReplacement.reduce((acc, field) => (allowSet.has(field) ? acc + 1 : acc), 0);
  }, [defaultAllow, defaultAllowReplacement]);

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
          <AllowedStat allowed={defaultAllow.length} total={defaultAllow.length} />
        </StatFlexItem>

        <StatFlexItem grow={false}>
          <AnonymizedStat anonymized={anonymized} isDataAnonymizable={true} />
        </StatFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <ContextEditor
        allow={defaultAllow}
        allowReplacement={defaultAllowReplacement}
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
