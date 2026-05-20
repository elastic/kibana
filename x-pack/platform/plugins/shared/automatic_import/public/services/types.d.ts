import type { CoreStart } from '@kbn/core/public';
import type { Observable } from 'rxjs';
import type { ReactNode } from 'react';
import type { AutomaticImportPluginStartDependencies } from '../types';
import type { AutomaticImportTelemetryService } from './telemetry';
export type RenderUpselling = ReactNode;
export type Services = CoreStart & AutomaticImportPluginStartDependencies & {
    telemetry: AutomaticImportTelemetryService;
    renderUpselling$: Observable<RenderUpselling | undefined>;
};
