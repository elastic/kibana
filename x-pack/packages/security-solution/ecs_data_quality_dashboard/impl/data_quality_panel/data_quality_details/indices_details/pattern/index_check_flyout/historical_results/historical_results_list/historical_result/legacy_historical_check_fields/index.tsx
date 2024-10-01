/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo, useMemo } from 'react';
import { EuiCallOut, EuiMarkdownFormat, EuiSpacer } from '@elastic/eui';

import { Actions } from '../../../../../../../../actions';
import { LegacyHistoricalResult } from '../../../../../../../../types';
import { IncompatibleCallout } from '../../../../incompatible_callout';
import { CheckSuccessEmptyPrompt } from '../../../../check_success_empty_prompt';
import {
  CHECK_IS_BASED_ON_LEGACY_FORMAT,
  DEPRECATED_DATA_FORMAT,
  TO_SEE_RUN_A_NEW_CHECK,
} from './translations';

interface Props {
  indexName: string;
  historicalResult: LegacyHistoricalResult;
}

const LegacyHistoricalCheckFieldsComponent: FC<Props> = ({ indexName, historicalResult }) => {
  const { markdownComments, incompatibleFieldCount, ecsVersion } = historicalResult;

  const markdownComment = useMemo(() => markdownComments.join('\n'), [markdownComments]);
  const tablesComment = useMemo(() => markdownComments.slice(4).join('\n'), [markdownComments]);

  return (
    <div data-test-subj="legacyHistoricalCheckFieldsComponent">
      {incompatibleFieldCount > 0 ? (
        <>
          <EuiCallOut color="warning" size="s" title={DEPRECATED_DATA_FORMAT}>
            <p>
              <span>{CHECK_IS_BASED_ON_LEGACY_FORMAT}</span>
              <br />
              <span>{TO_SEE_RUN_A_NEW_CHECK}</span>
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
          <IncompatibleCallout
            ecsVersion={ecsVersion}
            incompatibleFieldCount={incompatibleFieldCount}
          />
          <EuiSpacer />
          <EuiMarkdownFormat data-test-subj="incompatibleTablesMarkdown" textSize="s">
            {tablesComment}
          </EuiMarkdownFormat>
          <EuiSpacer />
          <Actions
            indexName={indexName}
            markdownComment={markdownComment}
            showChatAction
            showAddToNewCaseAction
            showCopyToClipboardAction
          />
        </>
      ) : (
        <CheckSuccessEmptyPrompt />
      )}
    </div>
  );
};

LegacyHistoricalCheckFieldsComponent.displayName = 'LegacyHistoricalCheckFieldsComponent';

export const LegacyHistoricalCheckFields = memo(LegacyHistoricalCheckFieldsComponent);
