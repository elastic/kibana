import type { CoreStart } from '@kbn/core/public';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../types';
export type StartServices<TAdditionalServices> = CoreStart & {
    plugins: {
        start: ObservabilityAIAssistantPluginStartDependencies;
    };
} & TAdditionalServices & {};
declare const useTypedKibana: <AdditionalServices extends object = {}>() => import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<CoreStart> & CoreStart & {
    plugins: {
        start: ObservabilityAIAssistantPluginStartDependencies;
    };
} & AdditionalServices>;
export { useTypedKibana as useKibana };
