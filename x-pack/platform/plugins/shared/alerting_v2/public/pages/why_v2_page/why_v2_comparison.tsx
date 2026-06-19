/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { WHY_V2_COMPARISON } from '../../content/why_v2_features';
import { whyV2PageStyles } from './why_v2_page.styles';

const ComparisonCellContent = ({ text, variant }: { text: string; variant: 'v1' | 'v2' }) => {
  if (variant === 'v2') {
    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="checkInCircleFilled" color="success" size="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <p>{text}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiText size="xs" color="subdued">
      <p>{text}</p>
    </EuiText>
  );
};

export const WhyV2Comparison = () => {
  const theme = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div css={whyV2PageStyles.comparisonSection()} data-test-subj="whyV2Comparison">
      <EuiButtonEmpty
        color="text"
        size="xs"
        flush="both"
        data-test-subj="whyV2ComparisonToggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <FormattedMessage
          id="xpack.alertingV2.whyV2.comparison.title"
          defaultMessage="See how Alerting v2 compares to v1"
        />
      </EuiButtonEmpty>
      {isOpen ? (
        <>
          <EuiSpacer size="m" />
          <div css={whyV2PageStyles.comparisonCard(theme)}>
            <table css={whyV2PageStyles.comparisonTable(theme)} data-test-subj="whyV2ComparisonTable">
              <thead>
                <tr>
                  <th scope="col" css={whyV2PageStyles.comparisonFeatureHeader(theme)} />
                  <th scope="col" css={whyV2PageStyles.comparisonV1Header(theme)}>
                    <FormattedMessage
                      id="xpack.alertingV2.whyV2.comparison.v1"
                      defaultMessage="Alerting v1"
                    />
                  </th>
                  <th scope="col" css={whyV2PageStyles.comparisonV2Header(theme)}>
                    <FormattedMessage
                      id="xpack.alertingV2.whyV2.comparison.v2"
                      defaultMessage="Alerting v2"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {WHY_V2_COMPARISON.map((row, index) => {
                  const isLastRow = index === WHY_V2_COMPARISON.length - 1;

                  return (
                    <tr key={row.dimension}>
                      <th scope="row" css={whyV2PageStyles.comparisonFeatureCell(theme, isLastRow)}>
                        {row.dimension}
                      </th>
                      <td css={whyV2PageStyles.comparisonV1Cell()}>
                        <ComparisonCellContent text={row.v1} variant="v1" />
                      </td>
                      <td css={whyV2PageStyles.comparisonV2Cell(theme, isLastRow)}>
                        <ComparisonCellContent text={row.v2} variant="v2" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
};
