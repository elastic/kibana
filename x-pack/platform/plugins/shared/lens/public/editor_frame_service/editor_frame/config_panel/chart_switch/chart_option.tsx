/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './chart_switch.scss';
import React from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiText,
  EuiHighlight,
  IconType,
  useEuiTheme,
  EuiIconTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export const ChartOption = ({
  option,
  searchValue = '',
}: {
  option: { label: string; description?: string; icon?: IconType };
  searchValue?: string;
}) => {
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      css={css`
        text-align: left;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon className="lnsChartSwitch__chartIcon" type={option.icon || 'empty'} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" data-test-subj="lnsChartSwitch-option-label">
          <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {option.description ? (
            <EuiHighlight search={searchValue}>{option.description}</EuiHighlight>
          ) : null}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const getDataLossWarning = (dataLoss: 'nothing' | 'layers' | 'everything' | 'columns') => {
  if (dataLoss === 'nothing') {
    return;
  }
  if (dataLoss === 'everything') {
    return i18n.translate('xpack.lens.chartSwitch.dataLossEverything', {
      defaultMessage: 'Changing to this visualization clears the current configuration.',
    });
  }
  if (dataLoss === 'layers') {
    return i18n.translate('xpack.lens.chartSwitch.dataLossLayersDescription', {
      defaultMessage:
        'Changing to this visualization modifies currently selected layer`s configuration and removes all other layers.',
    });
  } else
    return i18n.translate('xpack.lens.chartSwitch.dataLossColumns', {
      defaultMessage: `Changing to this visualization modifies the current configuration.`,
    });
};

const CheckIcon = () => {
  const { euiTheme } = useEuiTheme();
  return <EuiIcon type="check" color={euiTheme.colors.darkestShade} />;
};

const DataLossWarning = ({ content, id }: { content?: string; id: string }) => {
  const { euiTheme } = useEuiTheme();
  if (!content) return null;
  return (
    <EuiIconTip
      size="m"
      aria-label={content}
      type="dot"
      color={euiTheme.colors.warning}
      content={content}
      iconProps={{
        className: 'lnsChartSwitch__chartIcon',
        'data-test-subj': `lnsChartSwitchPopoverAlert_${id}`,
      }}
    />
  );
};

export const ChartSwitchOptionPrepend = ({
  isChecked,
  dataLoss,
  subtypeId,
}: {
  isChecked: boolean;
  dataLoss: 'nothing' | 'layers' | 'everything' | 'columns';
  subtypeId: string;
}) => {
  const dataLossWarning = getDataLossWarning(dataLoss);
  return (
    <EuiFlexItem grow={false}>
      {isChecked && <CheckIcon />}
      {dataLossWarning && <DataLossWarning content={dataLossWarning} id={subtypeId} />}
      {!dataLossWarning && !isChecked && <EuiIcon type="empty" />}
    </EuiFlexItem>
  );
};
