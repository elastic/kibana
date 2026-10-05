/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPONENT_DIAGRAM_ATTACHMENT_TYPE } from '../../../common/component_diagram/constants';
import type { InvestigationComponentDiagram } from '../../../common/component_diagram/component_diagram';
import type { InvestigationAttachmentRenderer } from '../../investigation_attachments';
import { COMPONENT_DIAGRAM_LABEL } from './translations';

/** Browser UI for the investigation_component_diagram attachment; the content loads on first render. */
export const componentDiagramAttachmentRenderer: InvestigationAttachmentRenderer<InvestigationComponentDiagram> & {
  type: typeof COMPONENT_DIAGRAM_ATTACHMENT_TYPE;
} = {
  type: COMPONENT_DIAGRAM_ATTACHMENT_TYPE,
  getLabel: () => COMPONENT_DIAGRAM_LABEL,
  icon: 'layers',
  loadContent: () =>
    import('./component_diagram_view').then(({ ComponentDiagramView }) => ComponentDiagramView),
};
