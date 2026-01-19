/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SolutionView } from '@kbn/spaces-plugin/common';

interface SolutionLabels {
  breadcrumbText: string;
  title: string;
}

/**
 * Returns both breadcrumb text and page title for the given solution.
 *
 * Serverless deployments always use the generic breadcrumb "AI Assistant",
 * but keep solution-specific titles. Cloud deployments use solution-specific
 * values for both breadcrumb and page title.
 */
export function getSolutionSpecificLabels({
  solution,
  isServerless,
}: {
  solution: SolutionView | undefined;
  isServerless: boolean;
}): SolutionLabels {
  let title: string;
  let breadcrumbText: string;

  switch (solution) {
    case 'oblt':
      title = i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.title.observability',
        {
          defaultMessage: 'AI Assistant for Observability',
        }
      );
      break;
    case 'es':
      title = i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.title.search', {
        defaultMessage: 'AI Assistant for Search',
      });
      break;
    default:
      title = i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.title.observabilityAndSearch',
        {
          defaultMessage: 'AI Assistant for Observability and Search',
        }
      );
  }

  if (isServerless) {
    breadcrumbText = i18n.translate(
      'xpack.observabilityAiAssistantManagement.breadcrumb.serverless',
      {
        defaultMessage: 'AI Assistant',
      }
    );
  } else {
    switch (solution) {
      case 'oblt':
        breadcrumbText = i18n.translate(
          'xpack.observabilityAiAssistantManagement.breadcrumb.observability',
          {
            defaultMessage: 'Observability',
          }
        );
        break;
      case 'es':
        breadcrumbText = i18n.translate(
          'xpack.observabilityAiAssistantManagement.breadcrumb.search',
          {
            defaultMessage: 'Search',
          }
        );
        break;
      default:
        breadcrumbText = i18n.translate(
          'xpack.observabilityAiAssistantManagement.breadcrumb.observabilityAndSearch',
          {
            defaultMessage: 'Observability and Search',
          }
        );
    }
  }

  return { breadcrumbText, title };
}
