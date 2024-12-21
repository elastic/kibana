/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import type { Query } from '@kbn/data-plugin/common';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-plugin/common';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { ISource } from '../source';
import { type IVectorSource, hasVectorSourceMethod } from '../vector_source';
import { DynamicStylePropertyOptions, StyleMetaData } from '../../../../common/descriptor_types';
import { IVectorStyle } from '../../styles/vector/vector_style';
import { IDynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';

export function isESVectorTileSource(source: ISource): boolean {
  return (
    hasVectorSourceMethod(source, 'isMvt') &&
    source.isMvt() &&
    hasESSourceMethod(source, 'getIndexPatternId')
  );
}

export function isESSource(source: ISource): source is IESSource {
  return (
    typeof (source as IESSource).getId === 'function' &&
    typeof (source as IESSource).getIndexPattern === 'function' &&
    typeof (source as IESSource).getIndexPatternId === 'function' &&
    typeof (source as IESSource).getGeoFieldName === 'function' &&
    typeof (source as IESSource).loadStylePropsMeta === 'function'
  );
}

export function hasESSourceMethod(
  source: ISource,
  methodName: keyof IESSource
): source is Pick<IESSource, typeof methodName> {
  return typeof (source as IESSource)[methodName] === 'function';
}

export interface IESSource extends IVectorSource {
  getId(): string;

  getIndexPattern(): Promise<DataView>;

  getIndexPatternId(): string;

  getGeoFieldName(): string | undefined;

  loadStylePropsMeta({
    layerName,
    style,
    dynamicStyleProps,
    registerCancelCallback,
    sourceQuery,
    timeFilters,
    searchSessionId,
    inspectorAdapters,
    executionContext,
  }: {
    layerName: string;
    style: IVectorStyle;
    dynamicStyleProps: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
    registerCancelCallback: (callback: () => void) => void;
    sourceQuery?: Query;
    timeFilters: TimeRange;
    searchSessionId?: string;
    inspectorAdapters: Adapters;
    executionContext: KibanaExecutionContext;
  }): Promise<{ styleMeta: StyleMetaData; warnings: SearchResponseWarning[] }>;
}
