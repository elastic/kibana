/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';
import { selectUnit } from '@formatjs/intl-utils';
import { type Investigation } from '../../types';

const UPDATE_INTERVAL_SECONDS = 60;

/** react-intl throws rather than schedule an update once the unit passes an hour. */
const INCREMENTABLE_UNITS: ReadonlyArray<ReturnType<typeof selectUnit>['unit']> = [
  'second',
  'minute',
  'hour',
];

/**
 * Ages itself. Nothing re-renders a card whose row is unchanged, so without this the
 * label freezes at whatever it read when the card mounted.
 */
export const ConversationMetaInfo = memo<{
  createdAt: Investigation['createdAt'];
}>(({ createdAt }) => {
  const { unit } = selectUnit(new Date(createdAt));

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive direction="row">
      <EuiFlexItem grow={false}>
        <EuiToolTip content={<FormattedDate value={createdAt} dateStyle="full" timeStyle="long" />}>
          {/* Focusable so the exact time is reachable without a pointer. */}
          <EuiText size="xs" color="subdued" component="span" tabIndex={0}>
            <FormattedRelative
              value={createdAt}
              updateIntervalInSeconds={
                INCREMENTABLE_UNITS.includes(unit) ? UPDATE_INTERVAL_SECONDS : undefined
              }
            />
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

ConversationMetaInfo.displayName = 'ConversationMetaInfo';
