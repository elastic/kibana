/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPortal,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
  EuiBadge,
  EuiToolTip
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get, keys } from 'lodash';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { idx } from '@kbn/elastic-idx';
import { px, units } from '../../../../../../../style/variables';
import { Summary } from '../../../../../../shared/Summary';
import { TimestampSummaryItem } from '../../../../../../shared/Summary/TimestampSummaryItem';
import { DurationSummaryItem } from '../../../../../../shared/Summary/DurationSummaryItem';
import { Span } from '../../../../../../../../typings/es_schemas/ui/Span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/Transaction';
import { DiscoverSpanLink } from '../../../../../../shared/Links/DiscoverLinks/DiscoverSpanLink';
import { Stacktrace } from '../../../../../../shared/Stacktrace';
import { ResponsiveFlyout } from '../ResponsiveFlyout';
import { DatabaseContext } from './DatabaseContext';
import { HttpContext } from './HttpContext';
import { StickySpanProperties } from './StickySpanProperties';

function formatType(type: string) {
  switch (type) {
    case 'db':
      return 'DB';
    case 'hard-navigation':
      return i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.spanType.navigationTimingLabel',
        {
          defaultMessage: 'Navigation timing'
        }
      );
    default:
      return type;
  }
}

function formatSubtype(subtype: string | undefined) {
  switch (subtype) {
    case 'mysql':
      return 'MySQL';
    default:
      return subtype;
  }
}

function getSpanTypes(span: Span) {
  const { type, subtype, action } = span.span;

  return {
    spanType: formatType(type),
    spanSubtype: formatSubtype(subtype),
    spanAction: action
  };
}

const TagName = styled.div`
  font-weight: bold;
`;

const SpanBadge = styled(EuiBadge)`
  display: inline-block;
  margin-right: ${px(units.quarter)};
`;

interface Props {
  span?: Span;
  parentTransaction?: Transaction;
  totalDuration?: number;
  onClose: () => void;
}

export function SpanFlyout({
  span,
  parentTransaction,
  totalDuration,
  onClose
}: Props) {
  if (!span) {
    return null;
  }

  const stackframes = span.span.stacktrace;
  const codeLanguage = idx(parentTransaction, _ => _.service.language.name);
  const dbContext = idx(span, _ => _.span.db);
  const httpContext = idx(span, _ => _.span.http);
  const spanLabels = span.labels;
  const labels = keys(spanLabels).map(key => ({
    key,
    value: get(spanLabels, key)
  }));
  const spanTypes = getSpanTypes(span);

  return (
    <EuiPortal>
      <ResponsiveFlyout onClose={onClose} size="m" ownFocus={true}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h2>
                  {i18n.translate(
                    'xpack.apm.transactionDetails.spanFlyout.spanDetailsTitle',
                    {
                      defaultMessage: 'Span details'
                    }
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <DiscoverSpanLink span={span}>
                <EuiButtonEmpty iconType="discoverApp">
                  {i18n.translate(
                    'xpack.apm.transactionDetails.spanFlyout.viewSpanInDiscoverButtonLabel',
                    {
                      defaultMessage: 'View span in Discover'
                    }
                  )}
                </EuiButtonEmpty>
              </DiscoverSpanLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <StickySpanProperties span={span} transaction={parentTransaction} />
          <EuiSpacer size="m" />
          <Summary
            items={[
              <TimestampSummaryItem time={span.timestamp.us / 1000} />,
              <DurationSummaryItem
                duration={span.span.duration.us}
                totalDuration={totalDuration}
                parentType="transaction"
              />,
              <>
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.apm.transactionDetails.spanFlyout.spanType',
                    { defaultMessage: 'Type' }
                  )}
                >
                  <SpanBadge color="hollow">{spanTypes.spanType}</SpanBadge>
                </EuiToolTip>
                {spanTypes.spanSubtype && (
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.apm.transactionDetails.spanFlyout.spanSubtype',
                      { defaultMessage: 'Subtype' }
                    )}
                  >
                    <SpanBadge color="hollow">
                      {spanTypes.spanSubtype}
                    </SpanBadge>
                  </EuiToolTip>
                )}
                {spanTypes.spanAction && (
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.apm.transactionDetails.spanFlyout.spanAction',
                      { defaultMessage: 'Action' }
                    )}
                  >
                    <SpanBadge color="hollow">{spanTypes.spanAction}</SpanBadge>
                  </EuiToolTip>
                )}
              </>
            ]}
          />
          <EuiHorizontalRule />
          <HttpContext httpContext={httpContext} />
          <DatabaseContext dbContext={dbContext} />
          <EuiTabbedContent
            tabs={[
              {
                id: 'stack-trace',
                name: i18n.translate(
                  'xpack.apm.transactionDetails.spanFlyout.stackTraceTabLabel',
                  {
                    defaultMessage: 'Stack Trace'
                  }
                ),
                content: (
                  <Fragment>
                    <EuiSpacer size="l" />
                    <Stacktrace
                      stackframes={stackframes}
                      codeLanguage={codeLanguage}
                    />
                  </Fragment>
                )
              },
              {
                id: 'labels',
                name: i18n.translate(
                  'xpack.apm.propertiesTable.tabs.labelsLabel',
                  {
                    defaultMessage: 'Labels'
                  }
                ),
                content: (
                  <Fragment>
                    <EuiBasicTable
                      columns={[
                        {
                          name: '',
                          field: 'key',
                          render: (key: string) => <TagName>{key}</TagName>
                        },
                        {
                          name: '',
                          field: 'value'
                        }
                      ]}
                      items={labels}
                    />
                  </Fragment>
                )
              }
            ]}
          />
        </EuiFlyoutBody>
      </ResponsiveFlyout>
    </EuiPortal>
  );
}
