/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList } from '@elastic/eui';
import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { transformTimeRangeOut } from '@kbn/presentation-publishing';
import deepEqual from 'fast-deep-equal';
import { memoize } from 'lodash';
import React from 'react';
import type {
  AnomalySwimLaneEmbeddableApi,
  AnomalySwimLaneEmbeddableState,
} from '../embeddables/anomaly_swimlane/types';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../embeddables/constants';

export const initComponent = memoize((fieldFormats: FieldFormatsStart) => {
  return React.memo(
    (props: UnifiedValueAttachmentViewProps) => {
      const { caseData } = props;
      const attachmentState = props.data.state as Record<string, unknown>;

      const dataFormatter = fieldFormats.deserialize({
        id: FIELD_FORMAT_IDS.DATE,
      });

      const inputProps = transformTimeRangeOut(
        attachmentState as unknown as AnomalySwimLaneEmbeddableState
      );

      const listItems = [
        {
          title: (
            <FormattedMessage
              id="xpack.ml.cases.anomalySwimLane.description.jobIdsLabel"
              defaultMessage="Job IDs"
            />
          ),
          description: inputProps.jobIds.join(', '),
        },
        ...(inputProps.swimlaneType === 'viewBy' && inputProps.viewBy
          ? [
              {
                title: (
                  <FormattedMessage
                    id="xpack.ml.cases.anomalySwimLane.description.viewByLabel"
                    defaultMessage="View by"
                  />
                ),
                description: inputProps.viewBy,
              },
            ]
          : []),
        {
          title: (
            <FormattedMessage
              id="xpack.ml.cases.anomalySwimLane.description.timeRangeLabel"
              defaultMessage="Time range"
            />
          ),
          description: `${dataFormatter.convert(
            inputProps.time_range!.from
          )} - ${dataFormatter.convert(inputProps.time_range!.to)}`,
        },
      ];

      if (typeof inputProps.query?.query === 'string' && inputProps.query?.query !== '') {
        listItems.push({
          title: (
            <FormattedMessage
              id="xpack.ml.cases.anomalySwimLane.description.queryLabel"
              defaultMessage="Query"
            />
          ),
          description: inputProps.query?.query,
        });
      }

      return (
        <>
          <EuiDescriptionList compressed type={'inline'} listItems={listItems} />
          <EmbeddableRenderer<AnomalySwimLaneEmbeddableState, AnomalySwimLaneEmbeddableApi>
            maybeId={inputProps.id}
            type={ANOMALY_SWIMLANE_EMBEDDABLE_TYPE}
            getParentApi={() => ({
              getSerializedStateForChild: () => inputProps,
              executionContext: {
                type: 'cases',
                description: caseData.title,
                id: caseData.id,
              },
            })}
          />
        </>
      );
    },
    (prevProps, nextProps) => deepEqual(prevProps.data.state, nextProps.data.state)
  );
});
