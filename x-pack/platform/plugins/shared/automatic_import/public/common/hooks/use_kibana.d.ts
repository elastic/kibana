export declare const useKibana: () => import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/public").CoreStart> & import("@kbn/core/public").CoreStart & import("../../types").AutomaticImportPluginStartDependencies & {
    telemetry: import("../../services/telemetry").AutomaticImportTelemetryService;
    renderUpselling$: import("rxjs").Observable<import("../../services/types").RenderUpselling | undefined>;
}>;
