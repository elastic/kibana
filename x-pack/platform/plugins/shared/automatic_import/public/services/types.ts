/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import type { Observable } from 'rxjs';
import type { AutomaticImportPluginStartDependencies } from '../types';
import type { TelemetryService } from './telemetry/service';

export type RenderUpselling = React.ReactNode;

export type Services = CoreStart &
  AutomaticImportPluginStartDependencies & {
    telemetry: TelemetryService;
    renderUpselling$: Observable<RenderUpselling | undefined>;
  };
