/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo, useMemo } from 'react';
import { EuiMarkdownFormat, EuiSpacer } from '@elastic/eui';

import { INCOMPATIBLE_FIELDS, SAME_FAMILY } from '../../../../../../../../translations';
import { Actions } from '../../../../../../../../actions';
import { LegacyHistoricalResult } from '../../../../../../../../types';
import { IncompatibleCallout } from '../../../../incompatible_callout';
import { CheckSuccessEmptyPrompt } from '../../../../check_success_empty_prompt';
import { INCOMPATIBLE_TAB_ID, SAME_FAMILY_TAB_ID } from '../../../../constants';
import { getIncompatibleStatBadgeColor } from '../../../../../../../../utils/get_incompatible_stat_badge_color';
import { CheckFieldsTabs } from '../../../../check_fields_tabs';
import { StyledHistoricalResultsCheckFieldsButtonGroup } from '../styles';
import { NOT_INCLUDED_IN_HISTORICAL_RESULTS } from './translations';

interface Props {
  indexName: string;
  historicalResult: LegacyHistoricalResult;
}

const LegacyHistoricalCheckFieldsComponent: FC<Props> = ({ indexName, historicalResult }) => {
  const { markdownComments, incompatibleFieldCount, ecsVersion, sameFamilyFieldCount } =
    historicalResult;

  const markdownComment = useMemo(() => markdownComments.join('\n'), [markdownComments]);
  const tablesComment = useMemo(() => markdownComments.slice(4).join('\n'), [markdownComments]);

  const tabs = useMemo(
    () => [
      {
        id: INCOMPATIBLE_TAB_ID,
        name: INCOMPATIBLE_FIELDS,
        badgeColor: getIncompatibleStatBadgeColor(incompatibleFieldCount),
        badgeCount: incompatibleFieldCount,
        content: (
          <div data-test-subj="legacyIncompatibleTabContent">
            {incompatibleFieldCount > 0 ? (
              <>
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
        ),
      },
      {
        id: SAME_FAMILY_TAB_ID,
        name: SAME_FAMILY,
        badgeColor: 'hollow',
        badgeCount: sameFamilyFieldCount,
        disabled: true,
        disabledReason: NOT_INCLUDED_IN_HISTORICAL_RESULTS,
      },
    ],
    [
      ecsVersion,
      incompatibleFieldCount,
      indexName,
      markdownComment,
      sameFamilyFieldCount,
      tablesComment,
    ]
  );

  return (
    <div data-test-subj="legacyHistoricalCheckFields">
      <CheckFieldsTabs
        tabs={tabs}
        renderButtonGroup={(props) => <StyledHistoricalResultsCheckFieldsButtonGroup {...props} />}
      />
    </div>
  );
};

LegacyHistoricalCheckFieldsComponent.displayName = 'LegacyHistoricalCheckFieldsComponent';

export const LegacyHistoricalCheckFields = memo(LegacyHistoricalCheckFieldsComponent);
