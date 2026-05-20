import type { HttpStart } from '@kbn/core/public';
import type { PropertySelectionHandler } from '@kbn/workflows';
export declare function createInferenceIdSelectionHandler(getHttp: () => Promise<HttpStart>): PropertySelectionHandler<string>;
