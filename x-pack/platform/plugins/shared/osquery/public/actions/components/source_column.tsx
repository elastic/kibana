/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

const LIVE_LABEL = i18n.translate('xpack.osquery.liveQueryActions.table.sourceColumn.live', {
  defaultMessage: 'Live',
});

const RULE_LABEL = i18n.translate('xpack.osquery.liveQueryActions.table.sourceColumn.rule', {
  defaultMessage: 'Rule',
});

export const getSourceLabel = (userId: string | undefined): string =>
  userId ? LIVE_LABEL : RULE_LABEL;

interface SourceColumnProps {
  userId: string | undefined;
}

const SourceColumnComponent: React.FC<SourceColumnProps> = ({ userId }) => (
  <>{getSourceLabel(userId)}</>
);

SourceColumnComponent.displayName = 'SourceColumn';

export const SourceColumn = React.memo(SourceColumnComponent);
