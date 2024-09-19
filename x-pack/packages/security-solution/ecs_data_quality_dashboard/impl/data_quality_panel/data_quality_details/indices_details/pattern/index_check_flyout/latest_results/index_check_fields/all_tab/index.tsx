/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { EuiCallOut, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { CompareFieldsTable } from '../compare_fields_table';
import { EmptyPromptBody } from '../../../empty_prompt_body';
import { EmptyPromptTitle } from '../../../empty_prompt_title';
import type { PartitionedFieldMetadata } from '../../../../../../../types';
import { getAllTableColumns } from './utils/get_all_table_columns';
import {
  ALL_CALLOUT,
  ALL_EMPTY,
  ALL_EMPTY_TITLE,
  ALL_FIELDS_TABLE_TITLE,
} from '../../../translations';

interface Props {
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
}

const AllTabComponent: React.FC<Props> = ({ indexName, partitionedFieldMetadata }) => {
  const body = useMemo(() => <EmptyPromptBody body={ALL_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={ALL_EMPTY_TITLE} />, []);

  return (
    <div data-test-subj="allTabContent">
      {partitionedFieldMetadata.all.length > 0 ? (
        <>
          <EuiCallOut size="s">
            <p>{ALL_CALLOUT(EcsVersion)}</p>
          </EuiCallOut>
          <EuiSpacer />
          <CompareFieldsTable
            enrichedFieldMetadata={partitionedFieldMetadata.all}
            getTableColumns={getAllTableColumns}
            title={ALL_FIELDS_TABLE_TITLE(indexName)}
          />
        </>
      ) : (
        <EuiEmptyPrompt
          body={body}
          iconType="cross"
          iconColor="danger"
          title={title}
          titleSize="s"
        />
      )}
    </div>
  );
};

AllTabComponent.displayName = 'AllTabComponent';

export const AllTab = React.memo(AllTabComponent);
