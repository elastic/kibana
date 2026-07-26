/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { TargetType } from '../types';
import {
  TARGET_TYPE_DATA_VIEW,
  TARGET_TYPE_INDEX,
  TARGET_TYPE_INDEX_PATTERN,
} from '../../common/target_types';

interface UseTargetIdHelpTextParams {
  targetType: TargetType;
  targetId: string;
  targetIdSearchValue: string;
  targetIdOptionsCount: number;
}

const getTargetGuidance = (targetType: TargetType): string => {
  if (targetType === TARGET_TYPE_DATA_VIEW) {
    return i18n.translate('anonymizationUi.profiles.targetId.guidance.dataView', {
      defaultMessage: 'Use the data view saved object id (for example: security-solution-default).',
    });
  }
  if (targetType === TARGET_TYPE_INDEX_PATTERN) {
    return i18n.translate('anonymizationUi.profiles.targetId.guidance.indexPattern', {
      defaultMessage: 'Use the literal index pattern string (for example: logs-*).',
    });
  }
  return i18n.translate('anonymizationUi.profiles.targetId.guidance.index', {
    defaultMessage: 'Use a concrete index name (for example: .alerts-security.alerts-default).',
  });
};

const getDynamicHint = ({
  targetType,
  targetId,
  targetIdSearchValue,
  targetIdOptionsCount,
}: UseTargetIdHelpTextParams): string | undefined => {
  const trimmedQuery = targetIdSearchValue.trim();

  if (
    targetType === TARGET_TYPE_DATA_VIEW &&
    trimmedQuery.length > 0 &&
    targetIdOptionsCount === 0
  ) {
    return i18n.translate('anonymizationUi.profiles.targetId.hint.noDataViews', {
      defaultMessage: 'No data views found. Verify permissions or create a data view first.',
    });
  }

  if (
    targetType !== TARGET_TYPE_DATA_VIEW &&
    trimmedQuery.length > 0 &&
    targetIdOptionsCount === 0
  ) {
    return i18n.translate('anonymizationUi.profiles.targetId.hint.noMatches', {
      defaultMessage:
        'No matching targets found. You can still use a custom value for non-data-view targets.',
    });
  }

  if (targetType === TARGET_TYPE_INDEX && targetId.trim().length > 0) {
    return i18n.translate('anonymizationUi.profiles.targetId.hint.indexSelectionValidation', {
      defaultMessage:
        'When selected, this value is validated to ensure it resolves to a concrete index.',
    });
  }

  return undefined;
};

export const useTargetIdHelpText = ({
  targetType,
  targetId,
  targetIdSearchValue,
  targetIdOptionsCount,
}: UseTargetIdHelpTextParams): React.ReactNode => {
  const targetGuidance = useMemo(() => getTargetGuidance(targetType), [targetType]);

  return useMemo(() => {
    const dynamicHint = getDynamicHint({
      targetType,
      targetId,
      targetIdSearchValue,
      targetIdOptionsCount,
    });

    return (
      <>
        <span>{targetGuidance}</span>
        {dynamicHint ? (
          <>
            <br />
            <span>{dynamicHint}</span>
          </>
        ) : null}
      </>
    );
  }, [targetGuidance, targetType, targetId, targetIdSearchValue, targetIdOptionsCount]);
};
