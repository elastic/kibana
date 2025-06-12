/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { EnrichedDeprecationInfo } from '../../../../common/types';
import { DEPRECATION_TYPE_MAP } from '../constants';
import { DeprecationTableColumns } from '../types';
import { DeprecationBadge, WarningLevels } from '../shared';

interface Props {
  resolutionTableCell?: React.ReactNode;
  fieldName: DeprecationTableColumns;
  deprecation: EnrichedDeprecationInfo;
  actionsTableCell?: React.ReactNode;
}

const i18nTexts = {
  manualCellLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.defaultDeprecation.manualCellLabel',
    {
      defaultMessage: 'Resolve manually',
    }
  ),
};

export const EsDeprecationsTableCells: React.FunctionComponent<Props> = ({
  resolutionTableCell,
  fieldName,
  deprecation,
  actionsTableCell,
}) => {
  // "Status column"
  if (fieldName === 'level') {
    return <DeprecationBadge level={deprecation.level as WarningLevels} />;
  }

  // "Issue" column
  if (fieldName === 'message') {
    return <>{deprecation.message}</>;
  }

  // "Type" column
  if (fieldName === 'type') {
    return <>{DEPRECATION_TYPE_MAP[deprecation.type as EnrichedDeprecationInfo['type']]}</>;
  }

  // "Resolution column"
  if (fieldName === 'correctiveAction') {
    if (resolutionTableCell) {
      return <>{resolutionTableCell}</>;
    }

    return (
      <EuiText size="s" color="subdued">
        <em>{i18nTexts.manualCellLabel}</em>
      </EuiText>
    );
  }

  // "Actions column"
  if (fieldName === 'actions') {
    if (actionsTableCell) {
      return <>{actionsTableCell}</>;
    }
    return <></>;
  }

  // Default behavior: render value or empty string if undefined
  return <>{deprecation[fieldName] ?? ''}</>;
};
