/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { memoize } from 'lodash';
import React from 'react';
import type { PersistableStateAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescriptionList } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import type {
  PatternAnalysisProps,
  PatternAnalysisSharedComponent,
} from '../shared_components/pattern_analysis';

export const initComponent = memoize(
  (fieldFormats: FieldFormatsStart, PatternAnalysisComponent: PatternAnalysisSharedComponent) => {
    return React.memo(
      (props: PersistableStateAttachmentViewProps) => {
        const { persistableStateAttachmentState } = props;

        const dataFormatter = fieldFormats.deserialize({
          id: FIELD_FORMAT_IDS.DATE,
        });

        const inputProps = persistableStateAttachmentState as unknown as PatternAnalysisProps;

        const listItems = [
          {
            title: (
              <FormattedMessage
                id="xpack.aiops.logPatternAnalysis.cases.timeRangeLabel"
                defaultMessage="Time range"
              />
            ),
            description: `${dataFormatter.convert(
              inputProps.timeRange.from
            )} - ${dataFormatter.convert(inputProps.timeRange.to)}`,
          },
        ];

        return (
          <>
            <EuiDescriptionList compressed type={'inline'} listItems={listItems} />
            <PatternAnalysisComponent {...inputProps} embeddingOrigin={'cases'} />
          </>
        );
      },
      (prevProps, nextProps) =>
        deepEqual(
          prevProps.persistableStateAttachmentState,
          nextProps.persistableStateAttachmentState
        )
    );
  }
);
