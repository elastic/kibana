/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { Replacements } from '@kbn/elastic-assistant-common';
import React, { useMemo } from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { AllowedStat } from './allowed_stat';
import { AnonymizedStat } from './anonymized_stat';
import { getStats } from '../get_stats';
import { AvailableStat } from './available_stat';

const StatFlexItem = styled(EuiFlexItem)`
  margin-right: ${({ theme }) => theme.eui.euiSizeL};
`;

interface Props {
  isDataAnonymizable: boolean;
  anonymizationFields?: AnonymizationFieldResponse[];
  rawData?: string | Record<string, string[]>;
  inline?: boolean;
  replacements?: Replacements;
  titleSize?: 's' | 'l' | 'xs' | 'm' | 'xxxs' | 'xxs' | undefined;
  gap?: string;
}

const StatsComponent: React.FC<Props> = ({
  isDataAnonymizable,
  anonymizationFields,
  rawData,
  inline,
  replacements,
  titleSize,
  gap,
}) => {
  const { allowed, anonymized, total } = useMemo(
    () =>
      getStats({
        anonymizationFields,
        rawData,
        replacements,
      }),
    [anonymizationFields, rawData, replacements]
  );

  return (
    <EuiFlexGroup alignItems="center" data-test-subj="stats" gutterSize="none">
      {isDataAnonymizable && (
        <StatFlexItem grow={false}>
          <AllowedStat
            allowed={allowed}
            gap={gap}
            total={total}
            inline={inline}
            titleSize={titleSize}
          />
        </StatFlexItem>
      )}

      <StatFlexItem grow={false}>
        <AnonymizedStat
          anonymized={anonymized}
          isDataAnonymizable={isDataAnonymizable || anonymized > 0}
          inline={inline}
          titleSize={titleSize}
          gap={gap}
        />
      </StatFlexItem>

      {isDataAnonymizable && (
        <StatFlexItem grow={false}>
          <AvailableStat total={total} inline={inline} titleSize={titleSize} gap={gap} />
        </StatFlexItem>
      )}
    </EuiFlexGroup>
  );
};

StatsComponent.displayName = 'StatsComponent';

export const Stats = React.memo(StatsComponent);
