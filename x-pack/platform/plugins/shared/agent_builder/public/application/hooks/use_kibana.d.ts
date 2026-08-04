import type { CoreStart } from '@kbn/core/public';
import type { ScopedHistory } from '@kbn/core-application-browser';
import type { AgentBuilderStartDependencies } from '../../types';
export type StartServices = CoreStart & {
    plugins: AgentBuilderStartDependencies;
    appParams: {
        history: ScopedHistory;
    };
};
declare const useTypedKibana: () => import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<CoreStart> & CoreStart & {
    plugins: AgentBuilderStartDependencies;
    appParams: {
        history: ScopedHistory;
    };
}>;
export { useTypedKibana as useKibana };
