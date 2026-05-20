import type { Observable } from 'rxjs';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { RenderUpselling } from './services/types';
import type { AutomaticImportTelemetryService } from './services/telemetry';
import type { AutomaticImportPluginStartDependencies } from './types';
export declare const renderApp: ({ coreStart, plugins, params, telemetryService, renderUpselling$, }: {
    coreStart: CoreStart;
    plugins: AutomaticImportPluginStartDependencies;
    params: AppMountParameters;
    telemetryService: AutomaticImportTelemetryService;
    renderUpselling$: Observable<RenderUpselling | undefined>;
}) => () => void;
