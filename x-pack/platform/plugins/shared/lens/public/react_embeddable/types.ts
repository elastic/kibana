/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Simplify } from '@kbn/chart-expressions-common';
import type { HttpSetup } from '@kbn/core/public';
import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import type { Capabilities } from '@kbn/core/types';
import type { TimefilterContract, FilterManager } from '@kbn/data-plugin/public';
import type { ReactExpressionRendererType } from '@kbn/expressions-plugin/public';
import type {
  VisualizationMap,
  DatasourceMap,
  DocumentToExpressionReturnType,
  LensDocument,
  LensAttributesService,
  LensByValueBase,
  LensByRefSerializedState,
  LensSerializedSharedState,
} from '@kbn/lens-common';
import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';
import type { RecursiveReadonly } from '@kbn/utility-types';
import type { LensApiSchemaType } from '@kbn/lens-embeddable-utils';
import type { LensPluginStartDependencies } from '../plugin';

export type LensEmbeddableStartServices = Simplify<
  LensPluginStartDependencies & {
    timefilter: TimefilterContract;
    coreHttp: HttpSetup;
    coreStart: CoreStart;
    capabilities: RecursiveReadonly<Capabilities>;
    expressionRenderer: ReactExpressionRendererType;
    documentToExpression: (
      doc: LensDocument,
      forceDSL?: boolean
    ) => Promise<DocumentToExpressionReturnType>;
    injectFilterReferences: FilterManager['inject'];
    visualizationMap: VisualizationMap;
    datasourceMap: DatasourceMap;
    theme: ThemeServiceStart;
    uiSettings: IUiSettingsClient;
    attributeService: LensAttributesService;
  }
>;

type LensByValueAPIConfigBase = Omit<LensByValueBase, 'attributes'> & {
  // Temporarily allow both old and new attributes until all are new types are supported and feature flag removed
  attributes: LensApiSchemaType | LensByValueBase['attributes'];
};

export type LensByValueSerializedAPIConfig = Simplify<
  LensSerializedSharedState & LensByValueAPIConfigBase
>;
export type LensByRefSerializedAPIConfig = LensByRefSerializedState;

/**
 * Combined properties of API config used in dashboard API for lens panels
 *
 *  Includes:
 * - Lens document state (for by-value)
 * - Panel settings
 * - other props from the embeddable
 */
export type LensSerializedAPIConfig = LensByRefSerializedAPIConfig | LensByValueSerializedAPIConfig;
