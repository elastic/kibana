/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { idx } from '@kbn/elastic-idx';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { Transaction } from '../../../../../../typings/es_schemas/ui/Transaction';
import { isRumAgentName } from '../../../../../../common/agent_name';
import { ErrorCountBadge } from '../ErrorCountBadge';
import { Duration } from './Duration';
import { Timestamp } from './Timestamp';
import { HttpInfo } from './HttpInfo';
import { Result } from './Result';
import { px, units } from '../../../../../../public/style/variables';

// TODO: Light/Dark theme (@see https://github.com/elastic/kibana/issues/44840)
const theme = euiLightVars;

const Item = styled(EuiFlexItem)`
  flex-wrap: nowrap;
  border-right: 1px solid ${theme.euiColorMediumShade};
  padding-right: ${px(units.half)};

  &:last-child {
    border-right: none;
    padding-right: 0;
  }
`;

interface Props {
  errorCount: number;
  totalDuration?: number;
  transaction: Transaction;
}

export function TraceSummary({
  errorCount,
  totalDuration,
  transaction
}: Props) {
  const result = idx(transaction, _ => _.transaction.result);
  const isRumAgent = isRumAgentName(transaction.agent.name);
  const url = isRumAgent
    ? idx(transaction, _ => _.transaction.page.url)
    : idx(transaction, _ => _.url.full);

  return (
    <>
      <EuiText size="s">
        <EuiFlexGroup justifyContent="flexStart" gutterSize="s" wrap={true}>
          <Item grow={false}>
            <Timestamp transactionTimestamp={transaction['@timestamp']} />
          </Item>
          <Item grow={false}>
            <Duration
              duration={transaction.transaction.duration.us}
              totalDuration={totalDuration}
            />
          </Item>
          {url && (
            <Item grow={false}>
              <HttpInfo transaction={transaction} url={url} />
            </Item>
          )}
          {result && !url && (
            <Item grow={false}>
              <Result result={result} />
            </Item>
          )}
          {errorCount > 0 && (
            <Item grow={false}>
              <span>
                <ErrorCountBadge title={undefined}>
                  {i18n.translate('xpack.apm.transactionDetails.errorCount', {
                    defaultMessage:
                      '{errorCount, number} {errorCount, plural, one {Error} other {Errors}}',
                    values: { errorCount }
                  })}
                </ErrorCountBadge>
              </span>
            </Item>
          )}
        </EuiFlexGroup>
      </EuiText>
    </>
  );
}
