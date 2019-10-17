/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiIconTip,
  EuiText,
  EuiCodeBlock,
} from '@elastic/eui';

import { msToPretty } from '../../utils';
import { HighlightDetailsTable } from './highlight_details_table';
import { BreakdownItem } from '../../types';

export interface Props {
  indexName: string;
  shardID: string;
  shardNumber: string;
  queryType: string;
  lucene: string;
  time: number;
  selfTime: number;
  breakdown: BreakdownItem[];
}

const DefEntry = ({ title, body }: { title: string | JSX.Element; body: string | JSX.Element }) => (
  <>
    <dt>{title}</dt>
    <dd>{body}</dd>
  </>
);

export const HighlightDetails = ({
  indexName,
  shardID,
  shardNumber,
  queryType,
  lucene,
  selfTime,
  time,
  breakdown,
}: Props) => {
  return (
    <EuiFlyout onClose={() => {}}>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiText size="s">{indexName}</EuiText>
        <EuiText>
          [{shardID}][{shardNumber}]
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <dl>
            {/* Type Entry */}
            <DefEntry
              title={i18n.translate('xpack.searchProfiler.highlightDetails.typeTitle', {
                defaultMessage: 'Type',
              })}
              body={queryType}
            />
            {/* Description Entry */}
            <DefEntry
              title={i18n.translate('xpack.searchProfiler.highlightDetails.descriptionTitle', {
                defaultMessage: 'Description',
              })}
              body={<EuiCodeBlock>lucene</EuiCodeBlock>}
            />
            {/* Total Time Entry */}
            <DefEntry
              title={
                <>
                  {i18n.translate('xpack.searchProfiler.highlightDetails.totalTimeTitle', {
                    defaultMessage: 'Total Time',
                  })}
                  <EuiIconTip
                    type="iInCircle"
                    color="subdued"
                    content={i18n.translate(
                      'xpack.searchProfiler.highlightDetails.totalTimeTooltip',
                      {
                        defaultMessage:
                          'The total time spent at this query component, inclusive of children',
                      }
                    )}
                  />
                </>
              }
              body={msToPretty(time, 3)}
            />
            {/* Self Time Entry */}
            <DefEntry
              title={
                <>
                  {i18n.translate('xpack.searchProfiler.highlightDetails.selfTimeTooltip', {
                    defaultMessage: 'Total Time',
                  })}
                  <EuiIconTip
                    type="iInCircle"
                    color="subdued"
                    content={i18n.translate(
                      'xpack.searchProfiler.highlightDetails.totalTimeTooltip',
                      {
                        defaultMessage:
                          'The time spent by this query component alone, exclusive of children',
                      }
                    )}
                  />
                </>
              }
              body={msToPretty(selfTime, 3)}
            />
          </dl>
          <HighlightDetailsTable breakdown={breakdown} />
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

//
// <div className="euiFlyoutHeader euiFlyoutHeader--hasBorder">
//   <h2 id="flyoutTitle">
//     <small className="prfDevTool__flyoutSubtitle">{{ detailRow.indexName }}</small> <br>
//     <strong>[{{ detailRow.shardID }}][{{ detailRow.shardNumber }}]</strong>
//   </h2>
// </div>
//
// <div className="euiFlyoutBody">
//   <div className="euiFlyoutBody__overflow">
//     <div className="euiText">
//       <dl>
//         <dt
//           i18n-id=""
//           i18n-default-message="Type"
//         ></dt>
//         <dd>{{ detailRow.query_type }}</dd>
//         <dt
//           i18n-id=""
//           i18n-default-message="Description"
//         ></dt>
//         <dd><code>{{ detailRow.lucene }}</code></dd>
//         <dt>
//           <span
//             tooltip="{{:: '' | i18n: { defaultMessage: '' } }}"
//             tooltip-placement="left"
//             i18n-id=""
//             i18n-default-message=""
//           ></span>
//         </dt>
//         <dd>{{ detailRow.time | msToPretty:3}}</dd>
//         <dt>
//           <span
//             tooltip="{{:: '' | i18n: { defaultMessage: '' } }}"
//             tooltip-placement="left"
//             i18n-id="xpack.searchProfiler.highlightDetails.selfTimeTitle"
//             i18n-default-message="Self Time"
//           ></span>
//         </dt>
//         <dd>{{ detailRow.selfTime | msToPretty:3}}</dd>
//       </dl>
//     </div>
//     <br>
//       <h3><strong
//         i18n-id="xpack.searchProfiler.highlightDetails.timingBreakdownTitle"
//         i18n-default-message="Timing Breakdown"
//       ></strong></h3>
//       <br>
//         <table className="prfDevTool__breakdown" width="100%">
//           <tr ng-repeat="breakdown in detailRow.breakdown">
//             <td className="prfDevTool__cell prfDevTool__description"><span tooltip="{{breakdown.tip}}"
//                                                                            tooltip-placement="left">{{
//               breakdown
//               .key
//             }}</span></td>
//             <td className="prfDevTool__cell prfDevTool__time">
//           <span className="euiBadge prfDevTool__badge" ng-style="{'background-color': breakdown.color}">
//             {{ breakdown.time | nsToPretty: 1}}
//           </span>
//             </td>
//             <td className="prfDevTool__cell prfDevTool__percentage">
//           <span className="euiBadge euiBadge--default prfDevTool__progress--percent"
//                 style="--prfDevToolProgressPercentage: {{breakdown.relative}}%">
//             <span className="prfDevTool__progress--percent-ie" ng-style="{'width': breakdown.relative + '%'}"></span>
//             <span className="prfDevTool__progressText">{{ breakdown.relative }}%</span>
//           </span>
//             </td>
//           </tr>
//         </table>
//   </div>
// </div>
