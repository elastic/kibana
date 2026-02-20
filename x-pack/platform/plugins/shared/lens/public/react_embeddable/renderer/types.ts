/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BehaviorSubject } from 'rxjs';

import type { ESQLControlVariable } from '@kbn/esql-types';
import type { ViewMode, useSearchApi } from '@kbn/presentation-publishing';
import type { HasSerializedChildState } from '@kbn/presentation-publishing';

import type { LensRuntimeState } from '@kbn/lens-common';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';

type SearchApi = ReturnType<typeof useSearchApi>;

interface GeneralLensApi {
  searchSessionId$: BehaviorSubject<string | undefined>;
  disabledActionIds$: BehaviorSubject<string[] | undefined>;
  setDisabledActionIds: (ids: string[] | undefined) => void;
  viewMode$: BehaviorSubject<ViewMode | undefined>;
  settings: {
    syncColors$: BehaviorSubject<boolean>;
    syncCursor$: BehaviorSubject<boolean>;
    syncTooltips$: BehaviorSubject<boolean>;
  };
  forceDSL?: boolean;
  esqlVariables$: BehaviorSubject<ESQLControlVariable[] | undefined>;
  hideTitle$: BehaviorSubject<boolean | undefined>;
  reload$: BehaviorSubject<void>;
}

export type LensParentApi = SearchApi &
  LensRuntimeState &
  GeneralLensApi &
  HasSerializedChildState<LensSerializedAPIConfig>;
