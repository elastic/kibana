/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { getPanelSizeGuidance } from '../panels';
import type { PanelSize } from './types';

const DEFAULT_SIZE: PanelSize = { w: 24, h: 10 };

/** Lens chart type of a panel (the `type` of its by-value config), when known. */
export const getLensChartType = ({ type, config }: AttachmentPanel): string | undefined =>
  type === LENS_EMBEDDABLE_TYPE && typeof config.type === 'string' ? config.type : undefined;

/** Default size of a panel placed without a size, from its panel kind's layout guidance. */
export const getDefaultPanelSize = (panel: AttachmentPanel): PanelSize =>
  getPanelSizeGuidance(panel.type, getLensChartType(panel))?.defaultSize ?? DEFAULT_SIZE;
