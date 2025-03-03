/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';

import { isOfAggregateQueryType } from '@kbn/es-query';
import { AttachmentActionType } from '../../../../client/attachment_framework/types';
import { useKibana } from '../../../../common/lib/kibana';
import {
  parseCommentString,
  getLensVisualizations,
} from '../../../../../common/utils/markdown_plugins/utils';
import { OPEN_IN_VISUALIZATION } from '../../../visualizations/translations';

export const useLensOpenVisualization = ({ comment }: { comment: string }) => {
  const parsedComment = parseCommentString(comment);
  const lensVisualization = getLensVisualizations(parsedComment?.children ?? []);

  const {
    lens: { navigateToPrefilledEditor, canUseEditor },
  } = useKibana().services;

  const hasLensPermissions = canUseEditor();

  const handleClick = useCallback(() => {
    navigateToPrefilledEditor(
      {
        id: '',
        timeRange: lensVisualization[0].timeRange,
        attributes: lensVisualization[0]
          .attributes as unknown as TypedLensByValueInput['attributes'],
      },
      {
        openInNewTab: true,
      }
    );
  }, [lensVisualization, navigateToPrefilledEditor]);

  if (!lensVisualization.length || lensVisualization?.[0]?.attributes == null) {
    return { canUseEditor: hasLensPermissions, actionConfig: null };
  }

  const lensAttributes = lensVisualization[0]
    .attributes as unknown as TypedLensByValueInput['attributes'];

  const isESQLQuery = isOfAggregateQueryType(lensAttributes.state.query);

  if (isESQLQuery) {
    return { canUseEditor: hasLensPermissions, actionConfig: null };
  }

  return {
    canUseEditor: hasLensPermissions,
    actionConfig: {
      type: AttachmentActionType.BUTTON as const,
      iconType: 'lensApp',
      label: OPEN_IN_VISUALIZATION,
      onClick: handleClick,
    },
  };
};
