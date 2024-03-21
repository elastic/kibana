/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { EuiCallOut, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { CompareFieldsTable } from '../../../compare_fields_table';
import { getCommonTableColumns } from '../../../compare_fields_table/get_common_table_columns';
import { EmptyPromptBody } from '../../index_properties/empty_prompt_body';
import { EmptyPromptTitle } from '../../index_properties/empty_prompt_title';
import * as i18n from '../../index_properties/translations';
import type { PartitionedFieldMetadata } from '../../../types';

interface Props {
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
}

const AllTabComponent: React.FC<Props> = ({ indexName, partitionedFieldMetadata }) => {
  const body = useMemo(() => <EmptyPromptBody body={i18n.ALL_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={i18n.ALL_EMPTY_TITLE} />, []);

  return (
    <>
      {partitionedFieldMetadata.all.length > 0 ? (
        <>
          <EuiCallOut size="s" title={i18n.ALL_CALLOUT_TITLE(partitionedFieldMetadata.all.length)}>
            <p>{i18n.ALL_CALLOUT(EcsVersion)}</p>
          </EuiCallOut>
          <EuiSpacer />
          <CompareFieldsTable
            enrichedFieldMetadata={partitionedFieldMetadata.all}
            getTableColumns={getCommonTableColumns}
            title={i18n.ALL_FIELDS_TABLE_TITLE(indexName)}
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
    </>
  );
};

AllTabComponent.displayName = 'AllTabComponent';

export const AllTab = React.memo(AllTabComponent);
