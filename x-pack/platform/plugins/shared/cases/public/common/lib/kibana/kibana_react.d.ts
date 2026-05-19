import { KibanaContextProvider, useUiSetting, useUiSetting$ } from '@kbn/kibana-react-plugin/public';
declare const useTypedKibana: () => import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/public").CoreStart> & import("@kbn/core/public").CoreStart & import("../../../types").CasesPublicStartDependencies>;
export { KibanaContextProvider, useTypedKibana as useKibana, useUiSetting, useUiSetting$ };
