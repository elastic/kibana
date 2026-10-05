/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COMPONENT_DIAGRAM_LABEL = i18n.translate(
  'xpack.agenticInvestigations.componentDiagram.attachments.label',
  { defaultMessage: 'Component diagram' }
);

export const componentDiagramRowLabel = (title: string | undefined): string =>
  title
    ? i18n.translate('xpack.agenticInvestigations.componentDiagram.rowLabel', {
        defaultMessage: 'Component diagram · {title}',
        values: { title },
      })
    : COMPONENT_DIAGRAM_LABEL;
