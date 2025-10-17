/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiAccordion,
  EuiListGroup,
  EuiListGroupItem,
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiCodeBlock,
} from '@elastic/eui';
import { replaceTokens } from './lib/replace_tokens';
import type { AlertMessage } from '../../common/types/alerts';
import type { AlertsByName } from './types';
import { isInSetupMode } from '../lib/setup_mode';
import { SetupModeContext } from '../components/setup_mode/setup_mode_context';
import { AlertConfiguration } from './configuration';

interface Props {
  alerts: AlertsByName;
}
export const AlertsCallout: React.FC<Props> = (props: Props) => {
  const { alerts } = props;
  const inSetupMode = isInSetupMode(React.useContext(SetupModeContext));

  if (inSetupMode) {
    return null;
  }
  // get a list of each alert state for each rule
  const list = Object.values(alerts)
    .flat()
    .map((alert) => alert.states.map((state) => ({ alert, state })))
    .flat();
  if (list.length === 0) {
    return null;
  }

  const accordions = list.map((status, index) => {
    const buttonContent = (
      <div>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="warning" size="m" color="danger" />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiTextColor color="danger">
              {replaceTokens(status.state.state.ui.message)}
            </EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );

    const { code } = status.state.state.ui.message;
    const accordion = (
      <EuiAccordion
        id={`monitoringAlertCallout_${index}`}
        buttonContent={buttonContent}
        paddingSize="s"
      >
        {code?.length ? (
          <EuiCodeBlock
            fontSize="s"
            paddingSize="s"
            language="json"
            isCopyable={true}
            overflowHeight={300}
          >
            {code}
          </EuiCodeBlock>
        ) : null}
        <EuiListGroup
          flush={true}
          bordered={true}
          gutterSize="m"
          size="xs"
          style={{
            marginTop: '0.5rem',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
            paddingLeft: `0.5rem`,
          }}
        >
          {(status.state.state.ui.message.nextSteps || []).map(
            (step: AlertMessage, stepIndex: number) => {
              return (
                <EuiListGroupItem
                  onClick={() => {}}
                  label={replaceTokens(step)}
                  key={index + stepIndex}
                />
              );
            }
          )}
          <EuiListGroupItem
            label={<AlertConfiguration alert={status.alert.sanitizedRule} key={index} compressed />}
          />
        </EuiListGroup>
      </EuiAccordion>
    );

    const spacer = index !== list.length - 1 ? <EuiSpacer /> : null;
    return (
      <div key={index}>
        {accordion}
        {spacer}
      </div>
    );
  });

  return (
    <Fragment>
      <EuiPanel>{accordions}</EuiPanel>
      <EuiSpacer />
    </Fragment>
  );
};
