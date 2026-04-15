/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { paths } from '../constants';
import {
  FEATURED_RULE_BUILDER_IDS,
  getBuildersForDisplay,
  type RuleBuilderId,
} from './rule_builder_definitions';
import { RuleBuilderCard } from './rule_builder_card';

export interface RuleBuilderGridProps {
  /** `featured`: three cards for empty list. `all`: full set for create hub. */
  variant: 'featured' | 'all';
  /** Optional override of which builders show in featured mode */
  featuredIds?: RuleBuilderId[];
  /** When set, cards call this instead of navigating via `href`. */
  onSelectBuilder?: (id: RuleBuilderId) => void;
}

export const RuleBuilderGrid = ({
  variant,
  featuredIds,
  onSelectBuilder,
}: RuleBuilderGridProps) => {
  const { basePath } = useService(CoreStart('http'));

  const builders = useMemo(
    () => getBuildersForDisplay(variant, featuredIds ?? FEATURED_RULE_BUILDER_IDS),
    [variant, featuredIds]
  );

  const columns = variant === 'featured' ? 3 : 2;

  return (
    <EuiFlexGrid columns={columns} gutterSize="m">
      {builders.map((builder) => (
        <EuiFlexItem key={builder.id}>
          <RuleBuilderCard
            builder={builder}
            layout={variant === 'featured' ? 'vertical' : 'horizontal'}
            {...(onSelectBuilder
              ? { onPick: () => onSelectBuilder(builder.id) }
              : {
                  href: basePath.prepend(
                    `${paths.ruleCreateForm}?builder=${encodeURIComponent(builder.id)}`
                  ),
                })}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
