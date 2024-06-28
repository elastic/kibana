/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';

import { EuiCallOut, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { CompareFieldsTable } from '../../../compare_fields_table';
import { getEcsCompliantTableColumns } from '../../../compare_fields_table/helpers';
import { EmptyPromptBody } from '../../index_properties/empty_prompt_body';
import { EmptyPromptTitle } from '../../index_properties/empty_prompt_title';
import { showMissingTimestampCallout } from '../helpers';
import { CalloutItem } from '../styles';
import * as i18n from '../../index_properties/translations';
import type { PartitionedFieldMetadata } from '../../../types';

const EmptyPromptContainer = styled.div`
  width: 100%;
`;

interface Props {
  indexName: string;
  onAddToNewCase: (markdownComments: string[]) => void;
  partitionedFieldMetadata: PartitionedFieldMetadata;
}

const EcsCompliantTabComponent: React.FC<Props> = ({
  indexName,
  onAddToNewCase,
  partitionedFieldMetadata,
}) => {
  const emptyPromptBody = useMemo(() => <EmptyPromptBody body={i18n.ECS_COMPLIANT_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={i18n.ECS_COMPLIANT_EMPTY_TITLE} />, []);

  return (
    <>
      {!showMissingTimestampCallout(partitionedFieldMetadata.ecsCompliant) ? (
        <>
          <EuiCallOut
            size="s"
            title={i18n.ECS_COMPLIANT_CALLOUT_TITLE(partitionedFieldMetadata.ecsCompliant.length)}
          >
            <p>
              {i18n.ECS_COMPLIANT_CALLOUT({
                fieldCount: partitionedFieldMetadata.ecsCompliant.length,
                version: EcsVersion,
              })}
            </p>
            <CalloutItem>{i18n.PRE_BUILT_DETECTION_ENGINE_RULES_WORK}</CalloutItem>
            <CalloutItem>{i18n.CUSTOM_DETECTION_ENGINE_RULES_WORK}</CalloutItem>
            <CalloutItem>{i18n.PAGES_DISPLAY_EVENTS}</CalloutItem>
            <CalloutItem>{i18n.OTHER_APP_CAPABILITIES_WORK_PROPERLY}</CalloutItem>
            <CalloutItem>{i18n.ECS_COMPLIANT_MAPPINGS_ARE_FULLY_SUPPORTED}</CalloutItem>
          </EuiCallOut>
          <EuiSpacer />
          <CompareFieldsTable
            enrichedFieldMetadata={partitionedFieldMetadata.ecsCompliant}
            getTableColumns={getEcsCompliantTableColumns}
            title={i18n.ECS_COMPLIANT_FIELDS_TABLE_TITLE(indexName)}
          />
        </>
      ) : (
        <EmptyPromptContainer>
          <EuiEmptyPrompt
            body={emptyPromptBody}
            iconType="cross"
            iconColor="danger"
            title={title}
            titleSize="s"
          />
        </EmptyPromptContainer>
      )}
    </>
  );
};

EcsCompliantTabComponent.displayName = 'EcsCompliantTabComponent';

export const EcsCompliantTab = React.memo(EcsCompliantTabComponent);
