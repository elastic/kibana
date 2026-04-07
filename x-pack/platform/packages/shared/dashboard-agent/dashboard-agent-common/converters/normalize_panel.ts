/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AttachmentPanel } from '../types';

const LENS_EMBEDDABLE_TYPE = 'lens';

export interface VisualizationContent {
  type: string;
  config: Record<string, unknown>;
}

/** Panel input that may or may not have a id assigned yet */
export type DashboardPanelInput = Omit<AttachmentPanel, 'id'> & { id?: string };

/**
 * Converts panel input to a full AttachmentPanel (embeddable format).
 * - Generates a id if not provided
 * - Wraps Lens config in `attributes` if needed
 */
export const toEmbeddablePanel = ({
  id,
  grid,
  type,
  config,
}: DashboardPanelInput): AttachmentPanel => {
  return {
    id: id ?? uuidv4(),
    grid,
    type,
    config:
      type === LENS_EMBEDDABLE_TYPE && !('attributes' in config)
        ? {
            ...(config.title ? { title: config.title } : {}),
            attributes: config,
          }
        : config,
  };
};

/**
 * Converts an embeddable panel back to vis input format.
 * - Unwraps Lens config from `attributes` if present
 */
export const fromEmbeddablePanel = ({ type, config }: AttachmentPanel): VisualizationContent => {
  if (type === LENS_EMBEDDABLE_TYPE && 'attributes' in config) {
    const { attributes, title } = config as { attributes: Record<string, unknown>; title?: string };
    return {
      type,
      config: {
        ...(title ? { title } : {}),
        ...attributes,
      },
    };
  }
  return { type, config };
};
