/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiStat, EuiText, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { getColor, getTooltipContent } from './helpers';
import { TITLE_SIZE } from '../constants';
import * as i18n from './translations';

const ANONYMIZATION_ICON = 'eyeClosed';

const AnonymizationIconFlexItem = styled(EuiFlexItem)`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
`;

interface Props {
  anonymized: number;
  isDataAnonymizable: boolean;
  showIcon?: boolean;
}

const AnonymizedStatComponent: React.FC<Props> = ({
  anonymized,
  isDataAnonymizable,
  showIcon = false,
}) => {
  const color = useMemo(() => getColor(isDataAnonymizable), [isDataAnonymizable]);

  const tooltipContent = useMemo(
    () => getTooltipContent({ anonymized, isDataAnonymizable }),
    [anonymized, isDataAnonymizable]
  );

  const description = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        {showIcon && (
          <AnonymizationIconFlexItem grow={false}>
            <EuiIcon
              color={color}
              data-test-subj="anonymizationIcon"
              size="m"
              type={ANONYMIZATION_ICON}
            />
          </AnonymizationIconFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <EuiText color={color} data-test-subj="description" size="s">
            {i18n.ANONYMIZED_FIELDS}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [color, showIcon]
  );

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiStat
        data-test-subj="anonymizedFieldsStat"
        description={description}
        reverse
        titleColor={color}
        title={anonymized}
        titleSize={TITLE_SIZE}
      />
    </EuiToolTip>
  );
};

AnonymizedStatComponent.displayName = 'AnonymizedStatComponent';

export const AnonymizedStat = React.memo(AnonymizedStatComponent);
